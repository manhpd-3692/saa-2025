//go:build integration

package notification_test

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// insertNotice stores a row as the owner, bypassing Create, so a test can hold
// params that Create would never store (a pre-edit named notice) and fix times.
func insertNotice(t *testing.T, tdb *testkit.TestDatabase, recipient uuid.UUID, kind string, params string,
	kudoID *uuid.UUID, createdAt time.Time, readAt *time.Time) uuid.UUID {
	t.Helper()
	var id uuid.UUID
	err := tdb.Owner.QueryRow(context.Background(), `
		insert into public.notifications (recipient_id, kind, params, kudo_id, created_at, read_at)
		values ($1, $2, $3::jsonb, $4, $5, $6) returning id`,
		recipient, kind, params, kudoID, createdAt, readAt).Scan(&id)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func readAtOf(t *testing.T, tdb *testkit.TestDatabase, id uuid.UUID) *time.Time {
	t.Helper()
	var readAt *time.Time
	if err := tdb.Owner.QueryRow(context.Background(),
		`select read_at from public.notifications where id = $1`, id).Scan(&readAt); err != nil {
		t.Fatal(err)
	}
	return readAt
}

func listAll(t *testing.T, reads *notification.ReadService, viewer notification.Viewer, limit int) []notification.Item {
	t.Helper()
	var items []notification.Item
	var after *notification.Cursor
	for page := 0; page < 100; page++ {
		got, err := reads.List(context.Background(), viewer, after, limit)
		if err != nil {
			t.Fatal(err)
		}
		if len(got.Items) > limit {
			t.Fatalf("page of %d items, limit %d", len(got.Items), limit)
		}
		items = append(items, got.Items...)
		if got.NextCursor == nil {
			return items
		}
		cursor, err := notification.DecodeCursor(*got.NextCursor)
		if err != nil {
			t.Fatalf("next cursor %q: %v", *got.NextCursor, err)
		}
		after = &cursor
	}
	t.Fatal("paging never ended")
	return nil
}

func itemByID(items []notification.Item, id uuid.UUID) notification.Item {
	for _, item := range items {
		if item.ID == id {
			return item
		}
	}
	return notification.Item{}
}

// F009 SC-008 / SC-012 read side (BR-007, Codex R02, N01): the list re-masks by
// the kudo's CURRENT anonymity, whatever is stored — a named notice stored before
// an anonymity change that skipped redaction still shows no sender to the
// recipient; an admin viewer keeps it (R02 masks non-admin viewers only); a named
// kudo keeps its sender.
func TestListRemasksSenderByCurrentAnonymity(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := notification.NewReadService(db.New(tdb.App))
	recipient, sender := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	hidden := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: recipient})
	named := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: recipient})
	forAdmin := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: admin})
	senderParams := `{"senderId":"` + sender.String() + `","senderName":"Real Sender","senderAvatarUrl":"https://example.test/a.png"}`
	now := time.Now()
	read := now.Add(-time.Minute)
	unreadHidden := insertNotice(t, tdb, recipient, "kudo_received", senderParams, &hidden, now.Add(-2*time.Minute), nil)
	readHidden := insertNotice(t, tdb, recipient, "kudo_received", senderParams, &hidden, now.Add(-3*time.Minute), &read)
	namedNotice := insertNotice(t, tdb, recipient, "kudo_received", senderParams, &named, now.Add(-4*time.Minute), nil)
	adminNotice := insertNotice(t, tdb, admin, "kudo_received", senderParams, &forAdmin, now, nil)
	for _, kudoID := range []uuid.UUID{hidden, forAdmin} {
		if _, err := tdb.Owner.Exec(context.Background(), `update public.kudos set is_anonymous = true where id = $1`, kudoID); err != nil {
			t.Fatal(err)
		}
	}

	items := listAll(t, reads, notification.Viewer{ID: recipient}, notification.PageSize)
	for _, id := range []uuid.UUID{unreadHidden, readHidden} {
		if item := itemByID(items, id); item.ID != id || hasSenderFields(item.Params) {
			t.Errorf("notice %s of a now-anonymous kudo = %+v, want listed without sender fields", id, item)
		}
	}
	if item := itemByID(items, namedNotice); item.Params[notification.ParamSenderName] != "Real Sender" {
		t.Errorf("named kudo notice lost its sender: %+v", item)
	}
	adminItems := listAll(t, reads, notification.Viewer{ID: admin, IsAdmin: true}, notification.PageSize)
	if item := itemByID(adminItems, adminNotice); item.Params[notification.ParamSenderName] != "Real Sender" {
		t.Errorf("admin viewer notice = %+v, want the stored sender (R02 re-masks non-admins)", item)
	}
}

// F009 SC-005 / SC-006 (BR-001, BR-005, SM-001): a Sunner marks only their own
// notice; another Sunner's id and an unknown id answer ErrNotFound and change
// nothing; marking twice keeps the first read time.
func TestMarkReadOwnOnlyAndKeepsFirstReadTime(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := notification.NewReadService(db.New(tdb.App))
	owner, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	notice := insertNotice(t, tdb, owner, "generic", `{"message":"hi"}`, nil, time.Now(), nil)
	ctx := context.Background()

	if err := reads.MarkRead(ctx, other, notice); !errors.Is(err, notification.ErrNotFound) {
		t.Fatalf("another Sunner marking it = %v, want ErrNotFound", err)
	}
	if err := reads.MarkRead(ctx, owner, uuid.New()); !errors.Is(err, notification.ErrNotFound) {
		t.Fatalf("unknown id = %v, want ErrNotFound", err)
	}
	if readAtOf(t, tdb, notice) != nil {
		t.Fatal("a refused mark-read changed the row")
	}
	if err := reads.MarkRead(ctx, owner, notice); err != nil {
		t.Fatal(err)
	}
	first := readAtOf(t, tdb, notice)
	time.Sleep(20 * time.Millisecond)
	if err := reads.MarkRead(ctx, owner, notice); err != nil {
		t.Fatalf("marking an already read notice = %v, want a no-op success", err)
	}
	if again := readAtOf(t, tdb, notice); first == nil || again == nil || !again.Equal(*first) {
		t.Fatalf("read_at %v then %v, want the first read time kept", first, again)
	}
}

// F009 US004 / SC-006 (FR-402, BR-005): read-all marks every unread notice of
// the caller only; earlier read times stay; another Sunner's notices stay unread.
func TestMarkAllReadTouchesOnlyTheCallersUnreadNotices(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := notification.NewReadService(db.New(tdb.App))
	owner, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()
	earlier := time.Now().Add(-time.Hour).Truncate(time.Microsecond)
	var alreadyRead []uuid.UUID
	for i := 0; i < 5; i++ {
		insertNotice(t, tdb, owner, "generic", `{"message":"unread"}`, nil, time.Now(), nil)
	}
	for i := 0; i < 2; i++ {
		alreadyRead = append(alreadyRead, insertNotice(t, tdb, owner, "generic", `{"message":"read"}`, nil, earlier, &earlier))
		insertNotice(t, tdb, other, "generic", `{"message":"other"}`, nil, time.Now(), nil)
	}

	marked, err := reads.MarkAllRead(ctx, owner)
	if err != nil || marked != 5 {
		t.Fatalf("MarkAllRead = %d, %v; want 5 rows", marked, err)
	}
	for _, id := range alreadyRead {
		if got := readAtOf(t, tdb, id); got == nil || !got.Equal(earlier) {
			t.Errorf("earlier read notice read_at = %v, want %v kept", got, earlier)
		}
	}
	if n, err := reads.UnreadCount(ctx, owner); err != nil || n != 0 {
		t.Errorf("owner unread = %d, %v; want 0", n, err)
	}
	if n, err := reads.UnreadCount(ctx, other); err != nil || n != 2 {
		t.Errorf("other Sunner unread = %d, %v; want 2 untouched", n, err)
	}
	if marked, err := reads.MarkAllRead(ctx, owner); err != nil || marked != 0 {
		t.Errorf("second MarkAllRead = %d, %v; want an idempotent 0", marked, err)
	}
}

// F009 SC-007 (FR-203, FR-205, FR-403): pages return each of the caller's
// notices once, newest first with the id as tie-break (equal created_at); the
// last page has no cursor; the unread count equals the unread rows. A notice
// about a kudo the caller can no longer open says so (A5 unavailable target).
func TestListPagesNewestFirstAndCountsUnread(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := notification.NewReadService(db.New(tdb.App))
	owner, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	public := tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: owner})
	spam := tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: owner, Spam: true})
	base := time.Now().Add(-time.Hour).Truncate(time.Microsecond)
	read := base.Add(time.Minute)
	type row struct {
		id uuid.UUID
		at time.Time
	}
	var want []row
	unread := 0
	for i := 0; i < 23; i++ {
		at := base.Add(time.Duration(i/2) * time.Second) // pairs share created_at
		var readAt *time.Time
		if i%3 == 0 {
			readAt = &read
		} else {
			unread++
		}
		kudoID := &public
		if i == 4 {
			kudoID = &spam
		}
		want = append(want, row{insertNotice(t, tdb, owner, "heart_received", `{"receiverName":"R"}`, kudoID, at, readAt), at})
	}
	insertNotice(t, tdb, other, "generic", `{"message":"not yours"}`, nil, base, nil)
	slices.SortFunc(want, func(a, b row) int {
		if c := b.at.Compare(a.at); c != 0 {
			return c
		}
		return slices.Compare(b.id[:], a.id[:])
	})

	items := listAll(t, reads, notification.Viewer{ID: owner}, 5)
	if len(items) != len(want) {
		t.Fatalf("listed %d notices, want %d", len(items), len(want))
	}
	for i, item := range items {
		if item.ID != want[i].id {
			t.Fatalf("position %d = %s, want %s (newest first, id tie-break)", i, item.ID, want[i].id)
		}
		if available := *item.KudoID != spam; item.KudoAvailable != available {
			t.Errorf("notice %s kudoAvailable = %v, want %v", item.ID, item.KudoAvailable, available)
		}
	}
	if n, err := reads.UnreadCount(context.Background(), owner); err != nil || n != int64(unread) {
		t.Fatalf("unread count = %d, %v; want %d", n, err, unread)
	}
}
