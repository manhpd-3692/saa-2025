//go:build integration

package moderation_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/moderation"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

type stallingNotifier struct{}

func (stallingNotifier) Create(ctx context.Context, _ notification.CreateInput) { <-ctx.Done() }

func count(t *testing.T, tdb *testkit.TestDatabase, sql string, args ...any) int {
	t.Helper()
	var n int
	if err := tdb.Owner.QueryRow(context.Background(), sql, args...).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

const spamWarnings = `select count(*) from public.notifications where recipient_id = $1 and kind = 'kudo_spam_warning'`

// F011 SC-003, SC-004, SC-006, SC-010 (R13): one write per real change, stale
// versions refused with the current row, same target is changed=false, only a
// change to Spam warns the author (merged while unread).
func TestVersionedDecisions(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := moderation.NewService(tdb.App, notification.NewService(tdb.App))
	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	author, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver})
	ctx := context.Background()

	d, err := svc.SetStatus(ctx, admin, kudoID, db.KudoStatusSpam, 0)
	if err != nil || !d.Changed || d.Kudo.Status != db.KudoStatusSpam || d.Kudo.ModerationVersion != 1 ||
		d.Kudo.ModeratedBy == nil || *d.Kudo.ModeratedBy != admin || d.Kudo.ModeratedAt == nil {
		t.Fatalf("spam at v0 = %+v, %v", d, err)
	}
	stale, err := svc.SetStatus(ctx, admin, kudoID, db.KudoStatusSpam, 0) // double click with the old version
	if !errors.Is(err, moderation.ErrStaleDecision) || stale.Kudo.Status != db.KudoStatusSpam || stale.Kudo.ModerationVersion != 1 {
		t.Fatalf("double click = %+v, %v; want stale_decision with the Spam row", stale, err)
	}
	same, err := svc.SetStatus(ctx, admin, kudoID, db.KudoStatusSpam, 1)
	if err != nil || same.Changed || same.Kudo.ModerationVersion != 1 {
		t.Fatalf("same target at current version = %+v, %v; want changed=false", same, err)
	}
	if n := count(t, tdb, spamWarnings, author); n != 1 {
		t.Fatalf("spam warnings = %d, want 1", n)
	}

	for version, target := range []db.KudoStatus{db.KudoStatusPublic, db.KudoStatusSpam} {
		d, err := svc.SetStatus(ctx, admin, kudoID, target, int32(version+1))
		if err != nil || !d.Changed || d.Kudo.ModerationVersion != int32(version+2) {
			t.Fatalf("cycle step %d -> %s = %+v, %v", version+1, target, d, err)
		}
	}
	if n := count(t, tdb, spamWarnings, author); n != 1 {
		t.Fatalf("spam warnings after Spam->Public->Spam = %d, want 1 (unread one updated)", n)
	}
	if _, err := svc.SetStatus(ctx, admin, kudoID, db.KudoStatusSpam, 0); !errors.Is(err, moderation.ErrStaleDecision) {
		t.Fatalf("replayed first decision err = %v, want stale", err)
	}
	if _, err := svc.SetStatus(ctx, admin, uuid.New(), db.KudoStatusPublic, 0); !errors.Is(err, moderation.ErrKudoNotFound) {
		t.Fatalf("unknown kudo err = %v, want ErrKudoNotFound (N08)", err)
	}
}

// F011 SC-009: opposing stale decisions — the first commit wins, the stale
// opposite is refused and writes no notice.
func TestOpposingStaleDecisionsFirstWins(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := moderation.NewService(tdb.App, notification.NewService(tdb.App))
	x, y := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true}), tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	author, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()

	toSpam := tdb.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver})
	if _, err := svc.SetStatus(ctx, x, toSpam, db.KudoStatusSpam, 0); err != nil {
		t.Fatal(err)
	}
	if d, err := svc.SetStatus(ctx, y, toSpam, db.KudoStatusPublic, 0); !errors.Is(err, moderation.ErrStaleDecision) || d.Kudo.Status != db.KudoStatusSpam {
		t.Fatalf("stale Public = %+v, %v; want refused, kudo stays Spam", d, err)
	}

	toPublic := tdb.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver, Spam: true})
	if _, err := svc.SetStatus(ctx, x, toPublic, db.KudoStatusPublic, 0); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.SetStatus(ctx, y, toPublic, db.KudoStatusSpam, 0); !errors.Is(err, moderation.ErrStaleDecision) {
		t.Fatalf("stale Spam err = %v, want refused", err)
	}
	if n := count(t, tdb, spamWarnings, author); n != 1 {
		t.Fatalf("spam warnings = %d, want only X's real change (1)", n)
	}
}

// F011 SC-005, SC-011 (R23): a failing or stalled notifier never undoes or
// delays the decision beyond the 2 s bound.
func TestDecisionCommitsWhenNotificationsFailOrStall(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	author, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	closed, err := pgxpool.NewWithConfig(context.Background(), tdb.App.Config())
	if err != nil {
		t.Fatal(err)
	}
	closed.Close()
	for name, notifier := range map[string]notification.Notifier{"failing": notification.NewService(closed), "stalled": stallingNotifier{}} {
		kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver})
		start := time.Now()
		d, err := moderation.NewService(tdb.App, notifier).SetStatus(context.Background(), admin, kudoID, db.KudoStatusSpam, 0)
		if err != nil || !d.Changed || time.Since(start) > notification.PostCommitTimeout+time.Second {
			t.Errorf("%s notifier: %+v, %v after %v", name, d, err, time.Since(start))
		}
	}
}
