//go:build integration

package gamification_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F008 SC-001 (BR-001) and SC-002 (BR-002, BR-003, DEC-002).
func TestHeartIsAnIdempotentSetterWithRules(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	clearActiveCampaigns(t, tdb)
	notes := &recordingNotifier{}
	svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, notes)
	sender, receiver, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	ctx := context.Background()

	for range 2 {
		state, err := svc.Set(ctx, other, kudoID, true)
		if err != nil || state != (gamification.HeartState{HeartTotal: 1, ViewerHearted: true}) {
			t.Fatalf("PUT = %+v, %v; want total 1, hearted", state, err)
		}
	}
	if h := heartsOn(t, tdb, kudoID); len(h) != 1 || h[other].Weight != 1 || h[other].CampaignID != nil {
		t.Fatalf("hearts = %+v, want one weight-1 heart without campaign", h)
	}
	if got := notes.kinds()[notification.KindHeartReceived]; got != 1 {
		t.Fatalf("heart_received requested %d times, want 1 (only for an added heart)", got)
	}
	if state, err := svc.Set(ctx, receiver, kudoID, true); err != nil || state.HeartTotal != 2 {
		t.Fatalf("recipient PUT = %+v, %v; the recipient may heart (G06)", state, err)
	}
	for range 2 {
		if state, err := svc.Set(ctx, other, kudoID, false); err != nil || state != (gamification.HeartState{HeartTotal: 1}) {
			t.Fatalf("DELETE = %+v, %v; want total 1, not hearted", state, err)
		}
	}

	spam := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Spam: true})
	refusals := []struct {
		name   string
		viewer uuid.UUID
		kudo   uuid.UUID
		want   error
	}{
		{"sender hearts own kudo", sender, kudoID, gamification.ErrCannotHeartOwn},
		{"spam kudo", other, spam, gamification.ErrKudoNotPublic},
		{"missing kudo", other, uuid.UUID{1}, gamification.ErrKudoNotFound},
	}
	for _, tc := range refusals {
		if _, err := svc.Set(ctx, tc.viewer, tc.kudo, true); !errors.Is(err, tc.want) {
			t.Errorf("%s: err = %v, want %v", tc.name, err, tc.want)
		}
	}
	if h := heartsOn(t, tdb, spam); len(h) != 0 {
		t.Errorf("refused heart was written: %+v", h)
	}
}

// F008 SC-003 (BR-004, G08, X04): the highest active multiplier is stored with
// the heart and never recalculated.
func TestHeartWeightFollowsTheHighestActiveCampaign(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	clearActiveCampaigns(t, tdb)
	svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, &recordingNotifier{})
	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	ctx := context.Background()
	heart := func() (gamification.HeartState, uuid.UUID) {
		user := tdb.CreateSunner(t, testkit.SunnerSpec{})
		state, err := svc.Set(ctx, user, kudoID, true)
		if err != nil {
			t.Fatal(err)
		}
		return state, user
	}

	createCampaign(t, tdb, admin, 4, false) // ended: ignored
	x2 := createCampaign(t, tdb, admin, 2, true)
	_, u1 := heart()
	x3 := createCampaign(t, tdb, admin, 3, true)
	state, u2 := heart()
	h := heartsOn(t, tdb, kudoID)
	if state.HeartTotal != 5 || h[u1].Weight != 2 || h[u1].CampaignID == nil || *h[u1].CampaignID != x2 ||
		h[u2].Weight != 3 || h[u2].CampaignID == nil || *h[u2].CampaignID != x3 {
		t.Fatalf("hearts = %+v (total %d), want weight 2 under x2, then 3 under overlapping x3", h, state.HeartTotal)
	}

	clearActiveCampaigns(t, tdb) // campaigns end (deleted): new hearts weigh 1, old ones keep theirs
	state, u3 := heart()
	h = heartsOn(t, tdb, kudoID)
	if state.HeartTotal != 6 || h[u3].Weight != 1 || h[u3].CampaignID != nil ||
		h[u1].Weight != 2 || h[u1].CampaignID != nil || h[u2].Weight != 3 || h[u2].CampaignID != nil {
		t.Fatalf("hearts = %+v (total %d), want weight 1 after the campaigns; old weights kept, campaign_id null",
			h, state.HeartTotal)
	}
}

// F008 SC-010 (Codex R09): a failed lookup inside the transaction records
// nothing: no heart, no box, no notification.
func TestCampaignLookupFailureRecordsNothing(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	notes := &recordingNotifier{}
	svc := gamification.NewHeartService(tdb.App, failingCampaigns{}, notes)
	sender, receiver, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	insertHearts(t, tdb, kudoID, 4) // the next heart would grant a box

	if _, err := svc.Set(context.Background(), other, kudoID, true); !errors.Is(err, gamification.ErrCampaignLookup) {
		t.Fatalf("err = %v, want ErrCampaignLookup", err)
	}
	if h := heartsOn(t, tdb, kudoID); len(h) != 4 || countBoxes(t, tdb, sender) != 0 || len(notes.kinds()) != 0 {
		t.Fatalf("after a failed lookup: %d hearts, %d boxes, notices %v; want 4, 0, none",
			len(h), countBoxes(t, tdb, sender), notes.kinds())
	}
}

// F008 SC-009 (R23): a failing or stalled notification service never changes
// or delays the committed heart beyond the 2 s bound.
func TestHeartCommitsWhenNotificationsFailOrStall(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	notifiers := map[string]notification.Notifier{
		"failing": notification.NewService(closedPool(t, tdb)),
		"stalled": stallingNotifier{},
	}
	for name, notifier := range notifiers {
		svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, notifier)
		user := tdb.CreateSunner(t, testkit.SunnerSpec{})
		start := time.Now()
		state, err := svc.Set(context.Background(), user, kudoID, true)
		if err != nil || !state.ViewerHearted || time.Since(start) > notification.PostCommitTimeout+time.Second {
			t.Errorf("%s notifier: state %+v, err %v after %v", name, state, err, time.Since(start))
		}
	}
	if h := heartsOn(t, tdb, kudoID); len(h) != 2 {
		t.Fatalf("hearts = %d, want both committed", len(h))
	}
}
