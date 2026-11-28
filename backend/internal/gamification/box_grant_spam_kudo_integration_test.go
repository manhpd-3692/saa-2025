//go:build integration

package gamification_test

import (
	"context"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F008 BR-006 / ALG-002 with D015 (review S5): the box high-water mark counts
// the weighted hearts on every kudo the Sunner sent. A kudo later marked spam
// keeps its hearts — they leave only the Highlight / Kudos Quốc Dân ranking
// (D015) — so they still count towards the next box; new hearts on it are
// refused (BR-003).
func TestHeartsKeptOnASpamKudoStillCountTowardsBoxes(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	clearActiveCampaigns(t, tdb)
	svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, &recordingNotifier{})
	sender, receiver, fan := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	flagged := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	public := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	insertHearts(t, tdb, flagged, 4)
	if _, err := tdb.Owner.Exec(context.Background(), `update public.kudos set status = 'spam' where id = $1`, flagged); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Set(context.Background(), fan, public, true); err != nil {
		t.Fatal(err)
	}
	if got := countBoxes(t, tdb, sender); got != 1 {
		t.Fatalf("boxes = %d after 4 kept hearts on the spam kudo + 1 new heart, want 1", got)
	}
}
