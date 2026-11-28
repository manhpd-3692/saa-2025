//go:build integration

package gamification_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

func completionNotices(t *testing.T, tdb *testkit.TestDatabase, user uuid.UUID) int {
	t.Helper()
	var n int
	if err := tdb.Owner.QueryRow(context.Background(), `select count(*) from public.notifications
		where recipient_id = $1 and kind = 'icons_completed' and dedupe_key = 'icons_completed:' || $1::text`, user).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// F008 BR-010 / FR-409 (Codex R11, review W3): the icons_completed notice is
// stored in the same transaction as users.icons_completed_at, so it exists
// exactly once even when everything after the commit is lost — here the
// post-commit notifier always fails, the equivalent of a crash after commit.
// Later opens and a replay of the completing key add nothing.
func TestCompletionNoticeIsStoredWithTheCompletedFlag(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	lostAfterCommit := notification.NewService(closedPool(t, tdb))
	svc := gamification.NewSecretBoxService(tdb.App, lostAfterCommit, &scriptedRandom{data: []byte{5, 0}})
	user := tdb.CreateSunner(t, testkit.SunnerSpec{})
	giveBoxes(t, tdb, user, 2, iconOrder[:5]...) // ROOT_FURTHER missing

	ctx := context.Background()
	key := uuid.New()
	if _, err := svc.Open(ctx, user, key); err != nil {
		t.Fatal(err)
	}
	if got := completionNotices(t, tdb, user); got != 1 {
		t.Fatalf("icons_completed notices after the completing open = %d, want 1 although the post-commit notifier failed", got)
	}
	if _, err := svc.Open(ctx, user, key); err != nil { // replay of the completing key
		t.Fatal(err)
	}
	if _, err := svc.Open(ctx, user, uuid.New()); err != nil { // a later open
		t.Fatal(err)
	}
	if got := completionNotices(t, tdb, user); got != 1 {
		t.Fatalf("icons_completed notices after a replay and a later open = %d, want still 1", got)
	}
}

// The notice is part of the open: when the open rolls back (here its key
// already opened another Sunner's box), neither the flag nor the notice remain.
func TestCompletionNoticeRollsBackWithTheOpen(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := gamification.NewSecretBoxService(tdb.App, &recordingNotifier{}, &scriptedRandom{data: []byte{0, 5}})
	other, user := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	giveBoxes(t, tdb, other, 1)
	giveBoxes(t, tdb, user, 1, iconOrder[:5]...)

	ctx := context.Background()
	taken := uuid.New()
	if _, err := svc.Open(ctx, other, taken); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Open(ctx, user, taken); !errors.Is(err, gamification.ErrIdempotencyKeyInUse) {
		t.Fatalf("open with another Sunner's key: err = %v, want ErrIdempotencyKeyInUse", err)
	}
	var completed bool
	if err := tdb.Owner.QueryRow(ctx, `select icons_completed_at is not null from public.users where id = $1`, user).Scan(&completed); err != nil {
		t.Fatal(err)
	}
	if completed || completionNotices(t, tdb, user) != 0 || unopenedCount(t, tdb, user) != 1 {
		t.Fatalf("after the rolled-back open: completed %v, notices %d, unopened %d; want false, 0, 1",
			completed, completionNotices(t, tdb, user), unopenedCount(t, tdb, user))
	}
}
