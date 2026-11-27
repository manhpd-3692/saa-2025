//go:build integration

package kudo

import (
	"context"
	"errors"
	"os"
	"slices"
	"strings"
	"testing"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// Reviewer W1: every name normalizeHashtags accepts passes the database check
// hashtags_name_normalized (ICU lower(), btrim, no leading `#`). Run over every
// graphic code point plus context-sensitive words, so a Go or Postgres/ICU
// Unicode upgrade that makes the two lower-casings disagree fails here first.
func TestHashtagLowerCaseMatchesTheDatabase(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	var names []string
	add := func(raw string) {
		got, code := normalizeHashtags([]string{raw})
		if code == "" && len(got) == 1 {
			names = append(names, got[0])
		}
	}
	for r := rune(1); r <= unicode.MaxRune; r++ {
		if utf8.ValidRune(r) && unicode.IsGraphic(r) {
			add(string(r))
		}
	}
	for _, word := range []string{"TiếngViệt", "ĐOÀN KẾT", "İSTANBUL", "ΣΟΦΙΑΣ", "ǅUNGLA", "STRAẞE", "ﬀ"} {
		add(word)
	}
	rows, err := tdb.App.Query(context.Background(), `select s from unnest($1::text[]) s
		where not (char_length(s) > 0 and s = lower(btrim(s)) and left(s, 1) <> '#')`, names)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var refused []string
	for rows.Next() {
		var s string
		if err := rows.Scan(&s); err != nil {
			t.Fatal(err)
		}
		refused = append(refused, s)
	}
	if err := rows.Err(); err != nil || len(refused) > 0 || len(names) < 100_000 {
		t.Fatalf("checked %d names (%v): the database refuses %d, first %q", len(names), err, len(refused), refused[:min(len(refused), 10)])
	}
}

// Reviewer W1 against the real database: Vietnamese and other non-ASCII
// hashtags are stored as normalized, NUL in content is dropped, and NUL in a
// title is a validation error with nothing written (never a 500).
func TestCreateStoresUnicodeHashtagsAndDropsNUL(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	store, err := upload.NewStorageObjectStore(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY"))
	if err != nil {
		t.Fatal(err)
	}
	svc := NewCreateService(tdb.App, db.New(tdb.App), upload.NewAttachmentFinalizer(store), notification.NewService(tdb.App))
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()

	_, err = svc.Create(ctx, sender, CreateInput{ReceiverID: receiver, Title: "Cảm\x00ơn", ContentHTML: "<p>x</p>", Hashtags: []string{"a"}})
	var invalid *ValidationError
	if !errors.As(err, &invalid) {
		t.Fatalf("NUL title: err = %v, want *ValidationError", err)
	}

	kudoID, err := svc.Create(ctx, sender, CreateInput{
		ReceiverID: receiver, Title: "Cảm ơn", ContentHTML: "<p>Cảm ơn\x00 bạn</p>",
		Hashtags: []string{"#TiếngViệt", "ĐOÀN KẾT", "İSTANBUL", "ΣΟΦΙΑΣ"},
	})
	if err != nil {
		t.Fatalf("create with Unicode hashtags and NUL content: %v", err)
	}
	var content string
	var stored []string
	if err := tdb.Owner.QueryRow(ctx, `select k.content, array_agg(h.name order by h.name)
		from public.kudos k join public.kudo_hashtags kh on kh.kudo_id = k.id join public.hashtags h on h.id = kh.hashtag_id
		where k.id = $1 group by k.content`, kudoID).Scan(&content, &stored); err != nil {
		t.Fatal(err)
	}
	want, _ := normalizeHashtags([]string{"#TiếngViệt", "ĐOÀN KẾT", "İSTANBUL", "ΣΟΦΙΑΣ"})
	slices.Sort(want)
	slices.Sort(stored) // compare by code point, not by the database collation
	if strings.ContainsRune(content, 0) || content != "<p>Cảm ơn bạn</p>" || !slices.Equal(stored, want) {
		t.Fatalf("stored content %q, hashtags %q; want NUL dropped and hashtags %q", content, stored, want)
	}
	if n := countKudosBy(t, tdb, sender); n != 1 {
		t.Fatalf("kudos written = %d, want only the valid one", n)
	}
}

func countKudosBy(t *testing.T, tdb *testkit.TestDatabase, sender uuid.UUID) int {
	t.Helper()
	var n int
	if err := tdb.Owner.QueryRow(context.Background(), `select count(*) from public.kudos where sender_id = $1`, sender).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}
