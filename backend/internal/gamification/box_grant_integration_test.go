//go:build integration

package gamification_test

import (
	"context"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F008 SC-004 (BR-006, ALG-002): the 5th weighted heart on a sender's kudos
// grants exactly one box; withdraw then re-heart grants none.
func TestFifthHeartGrantsOneBoxAndReheartGrantsNone(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	clearActiveCampaigns(t, tdb)
	notes := &recordingNotifier{}
	svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, notes)
	sender, receiver, fifth := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	first := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	second := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Anonymous: true})
	insertHearts(t, tdb, first, 2)
	insertHearts(t, tdb, second, 2) // hearts on any of the sender's kudos count

	ctx := context.Background()
	if _, err := svc.Set(ctx, fifth, second, true); err != nil {
		t.Fatal(err)
	}
	if got := countBoxes(t, tdb, sender); got != 1 {
		t.Fatalf("boxes after the 5th heart = %d, want 1", got)
	}
	for _, hearted := range []bool{false, true, false, true} {
		if _, err := svc.Set(ctx, fifth, second, hearted); err != nil {
			t.Fatal(err)
		}
	}
	if got := countBoxes(t, tdb, sender); got != 1 {
		t.Fatalf("boxes after withdraw/re-heart = %d, want still 1 (high-water mark)", got)
	}
	if got := notes.kinds()[notification.KindSecretBoxReceived]; got != 1 {
		t.Fatalf("secret_box_received requested %d times, want 1", got)
	}
}

// F008 SC-004 concurrency: two hearts that cross 5 grant exactly one box. A
// test-held lock on the sender row (the lock LockUserForBoxTopUp takes) queues
// both heart transactions after their heart insert; released together, the
// sender lock serializes the top-ups so the second sees the first's heart.
func TestConcurrentHeartsCrossingFiveGrantOneBox(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	clearActiveCampaigns(t, tdb)
	svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, &recordingNotifier{})
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoA := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	kudoB := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	insertHearts(t, tdb, kudoA, 4)
	v1, v2 := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})

	ctx := context.Background()
	barrier := tdb.HoldRowLock(t, `select id from public.users where id = $1 for no key update`, sender)
	errs := barrier.RunQueued(t,
		func() error { _, err := svc.Set(ctx, v1, kudoA, true); return err },
		func() error { _, err := svc.Set(ctx, v2, kudoB, true); return err },
	)
	for _, err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	if got := len(heartsOn(t, tdb, kudoA)) + len(heartsOn(t, tdb, kudoB)); got != 6 {
		t.Fatalf("hearts = %d, want 6", got)
	}
	if got := countBoxes(t, tdb, sender); got != 1 {
		t.Fatalf("boxes = %d after two simultaneous hearts 4 -> 6, want 1", got)
	}
}

// Two Sunners hearting each other's kudos at the same moment must not deadlock
// on the KEY SHARE locks their heart inserts take on users rows.
func TestMutualHeartsDoNotDeadlock(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, &recordingNotifier{})
	a, b := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ofA := tdb.CreateKudo(t, testkit.KudoSpec{Sender: a, Receiver: b})
	ofB := tdb.CreateKudo(t, testkit.KudoSpec{Sender: b, Receiver: a})

	ctx := context.Background()
	for round := range 10 {
		hearted := round%2 == 0
		errs := startTogether(
			func() error { _, err := svc.Set(ctx, b, ofA, hearted); return err },
			func() error { _, err := svc.Set(ctx, a, ofB, hearted); return err },
		)
		for _, err := range errs {
			if err != nil {
				t.Fatalf("round %d: %v", round, err)
			}
		}
	}
}
