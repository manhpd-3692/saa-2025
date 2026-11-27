//go:build integration

package notification_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

type storedNotice struct {
	Kind      string
	Params    map[string]any
	KudoID    *uuid.UUID
	DedupeKey *string
	CreatedAt time.Time
}

func noticesOf(t *testing.T, tdb *testkit.TestDatabase, recipient uuid.UUID) []storedNotice {
	t.Helper()
	rows, err := tdb.Owner.Query(context.Background(), `
		select kind, params, kudo_id, dedupe_key, created_at from public.notifications
		where recipient_id = $1 order by created_at, id`, recipient)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []storedNotice
	for rows.Next() {
		var n storedNotice
		var raw []byte
		if err := rows.Scan(&n.Kind, &raw, &n.KudoID, &n.DedupeKey, &n.CreatedAt); err != nil {
			t.Fatal(err)
		}
		if err := json.Unmarshal(raw, &n.Params); err != nil {
			t.Fatal(err)
		}
		out = append(out, n)
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	return out
}

func markAllRead(t *testing.T, tdb *testkit.TestDatabase, recipient uuid.UUID) {
	t.Helper()
	if _, err := tdb.Owner.Exec(context.Background(),
		`update public.notifications set read_at = now() where recipient_id = $1 and read_at is null`, recipient); err != nil {
		t.Fatal(err)
	}
}

func create(svc *notification.Service, in notification.CreateInput) {
	ctx, cancel := notification.PostCommitContext(context.Background())
	defer cancel()
	svc.Create(ctx, in)
}

// F009 SC-001, SC-011: each of the seven kinds is stored for its recipient;
// review_requested and spam_warning are rejected.
func TestCreateAcceptsExactlyTheSevenKinds(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := notification.NewService(tdb.App)
	recipient, actor := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})

	kinds := []notification.Kind{
		notification.KindKudoReceived, notification.KindHeartReceived, notification.KindSecretBoxReceived,
		notification.KindHeroLevelUp, notification.KindKudoSpamWarning, notification.KindIconsCompleted, notification.KindGeneric,
		"review_requested", "spam_warning",
	}
	for _, kind := range kinds {
		create(svc, notification.CreateInput{RecipientID: recipient, ActorID: actor, Kind: kind, DedupeKey: "k:" + string(kind)})
	}
	got := noticesOf(t, tdb, recipient)
	if len(got) != 7 {
		t.Fatalf("stored %d notices, want the 7 valid kinds: %+v", len(got), got)
	}
	for _, n := range got {
		if !notification.Kind(n.Kind).Valid() {
			t.Errorf("stored invalid kind %q", n.Kind)
		}
	}
}

// F009 SC-003 (BR-003, BR-004) and SC-013 (N03).
func TestSelfActionMergeAndOnceEverRules(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := notification.NewService(tdb.App)
	recipient, actor := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: recipient, Receiver: actor})

	create(svc, notification.CreateInput{RecipientID: recipient, ActorID: recipient, Kind: notification.KindGeneric})
	if got := noticesOf(t, tdb, recipient); len(got) != 0 {
		t.Fatalf("self-action stored %d notices", len(got))
	}

	heart := func(name string) {
		create(svc, notification.CreateInput{RecipientID: recipient, ActorID: actor, Kind: notification.KindHeartReceived,
			Params: map[string]any{"receiverName": name}, KudoID: &kudoID, DedupeKey: "heart:" + kudoID.String()})
	}
	heart("first")
	first := noticesOf(t, tdb, recipient)
	heart("second")
	merged := noticesOf(t, tdb, recipient)
	if len(merged) != 1 || merged[0].Params["receiverName"] != "second" || !merged[0].CreatedAt.After(first[0].CreatedAt) {
		t.Fatalf("unread repeat did not merge (params replaced, time bumped): %+v", merged)
	}
	markAllRead(t, tdb, recipient)
	heart("third")
	if got := noticesOf(t, tdb, recipient); len(got) != 2 {
		t.Fatalf("heart after read: %d notices, want a new row (2)", len(got))
	}

	level := notification.HeroLevelUpInput(notification.HeroTransition{
		ReceiverID: recipient, ActorID: actor, FromTier: "New", ToTier: "Rising", SendersCount: 5,
	})
	create(svc, level)
	markAllRead(t, tdb, recipient)
	create(svc, level) // reached Rising again after being moderated below it
	icons := notification.CreateInput{RecipientID: recipient, Kind: notification.KindIconsCompleted,
		DedupeKey: "icons_completed:" + recipient.String()}
	create(svc, icons)
	markAllRead(t, tdb, recipient)
	create(svc, icons)

	counts := map[string]int{}
	for _, n := range noticesOf(t, tdb, recipient) {
		counts[n.Kind]++
	}
	if counts["hero_level_up"] != 1 || counts["icons_completed"] != 1 {
		t.Fatalf("once-ever kinds stored %v, want exactly one each", counts)
	}
}

// F009 SC-014 (N04): the F005 transition maps to levelKey/fromLevelKey/sendersCount.
func TestHeroLevelUpParamsAndDedupeKey(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := notification.NewService(tdb.App)
	receiver, sender := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})

	create(svc, notification.HeroLevelUpInput(notification.HeroTransition{
		ReceiverID: receiver, ActorID: sender, FromTier: "New", ToTier: "Rising", SendersCount: 5,
	}))
	got := noticesOf(t, tdb, receiver)
	if len(got) != 1 {
		t.Fatalf("stored %d notices, want 1", len(got))
	}
	n := got[0]
	wantKey := "hero_level:" + receiver.String() + ":Rising"
	if n.Kind != "hero_level_up" || n.DedupeKey == nil || *n.DedupeKey != wantKey || n.KudoID != nil ||
		n.Params["levelKey"] != "Rising" || n.Params["fromLevelKey"] != "New" || n.Params["sendersCount"] != float64(5) {
		t.Fatalf("stored %+v (dedupe %v), want hero_level_up {Rising, New, 5} under %s", n, n.DedupeKey, wantKey)
	}
}
