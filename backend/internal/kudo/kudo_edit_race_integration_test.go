//go:build integration

package kudo_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/moderation"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// queueInOrder starts each fn only once the previous ones wait behind the
// barrier, then releases it: Postgres grants the row to the waiters in that
// order (the first waiter holds the tuple lock the next ones queue on).
func queueInOrder(t *testing.T, barrier *testkit.RowLockBarrier, fns ...func() error) []error {
	t.Helper()
	errs := make([]error, len(fns))
	var wg sync.WaitGroup
	for i, fn := range fns {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs[i] = fn()
		}()
		barrier.WaitForWaiters(t, i+1)
	}
	barrier.Release(t)
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("queued transactions did not finish after the release (deadlock?)")
	}
	return errs
}

// Reviewer W6 (a), Codex N05 / BR-006: an edit and an admin's spam decision on
// the same kudo serialize on the kudo row. When the decision commits first, the
// edit — which passed its unlocked pre-check while the kudo was still public —
// is refused by the re-check under the lock and writes nothing; when the edit
// commits first it is saved and the decision applies after it.
func TestEditRacingASpamDecisionSerializesOnTheKudoRow(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	create := newCreateService(t, tdb, notification.NewService(tdb.App))
	edit := newUpdateService(t, tdb, nil)
	decide := moderation.NewService(tdb.App, notification.NewService(tdb.App))
	ctx := context.Background()

	for _, decisionFirst := range []bool{true, false} {
		kudoID, err := create.Create(ctx, sender, validInput(receiver))
		if err != nil {
			t.Fatal(err)
		}
		form, err := edit.GetForEdit(ctx, sender, kudoID)
		if err != nil {
			t.Fatal(err)
		}
		changed := asUpdate(form)
		changed.Title = "Edited while moderated"
		editFn := func() error { return edit.Update(ctx, sender, kudoID, changed) }
		decideFn := func() error { _, err := decide.SetStatus(ctx, admin, kudoID, db.KudoStatusSpam, 0); return err }
		fns := []func() error{decideFn, editFn}
		if !decisionFirst {
			fns = []func() error{editFn, decideFn}
		}

		barrier := tdb.HoldRowLock(t, `select id from public.kudos where id = $1 for no key update`, kudoID)
		errs := queueInOrder(t, barrier, fns...)
		decisionErr, editErr := errs[0], errs[1]
		if !decisionFirst {
			decisionErr, editErr = errs[1], errs[0]
		}
		stored := scalar[string](t, tdb, `select title || '|' || status from public.kudos where id = $1`, kudoID)
		switch {
		case decisionErr != nil:
			t.Fatalf("decisionFirst=%v: spam decision failed: %v", decisionFirst, decisionErr)
		case decisionFirst && (!errors.Is(editErr, kudo.ErrKudoSpam) || stored != "Người truyền cảm hứng|spam"):
			t.Fatalf("decision first: edit err %v, stored %q; want ErrKudoSpam and nothing written", editErr, stored)
		case !decisionFirst && (editErr != nil || stored != "Edited while moderated|spam"):
			t.Fatalf("edit first: edit err %v, stored %q; want the edit saved, then spam", editErr, stored)
		}
	}
}
