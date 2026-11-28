//go:build integration

package gamification_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F008 A3 (FR-204, BR-004, INT-001): the badge read answers null when no
// campaign is active, and otherwise the highest active multiplier with its name
// and window — the same campaign a heart given now is weighted by.
func TestActiveCampaignReadShowsTheMultiplierHeartsGet(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	clearActiveCampaigns(t, tdb)
	handler := gamification.NewActiveCampaignHandler(gamification.DBActiveCampaigns{Queries: db.New(tdb.App)})
	read := func() (int, string) {
		rec := httptest.NewRecorder()
		handler.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/campaigns/active", nil))
		return rec.Code, strings.TrimSpace(rec.Body.String())
	}
	if code, body := read(); code != http.StatusOK || body != "null" {
		t.Fatalf("no campaign: %d %s, want 200 null", code, body)
	}

	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	createCampaign(t, tdb, admin, 5, false) // ended: ignored
	createCampaign(t, tdb, admin, 2, true)
	x3 := createCampaign(t, tdb, admin, 3, true)
	code, body := read()
	var got struct {
		Name       string `json:"name"`
		Multiplier int    `json:"multiplier"`
		StartsAt   string `json:"startsAt"`
		EndsAt     string `json:"endsAt"`
	}
	if err := json.Unmarshal([]byte(body), &got); code != http.StatusOK || err != nil || got.Name != "Test x3" ||
		got.Multiplier != 3 || got.StartsAt == "" || got.EndsAt <= got.StartsAt {
		t.Fatalf("overlapping x2 and x3: %d %s, want the x3 campaign with its window", code, body)
	}

	sender, receiver, fan := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	svc := gamification.NewHeartService(tdb.App, gamification.DBCampaignReader{}, &recordingNotifier{})
	if state, err := svc.Set(context.Background(), fan, kudoID, true); err != nil || state.HeartTotal != int64(got.Multiplier) {
		t.Fatalf("heart under the shown campaign = %+v, %v; want total %d", state, err, got.Multiplier)
	}
	if h := heartsOn(t, tdb, kudoID)[fan]; h.CampaignID == nil || *h.CampaignID != x3 {
		t.Fatalf("heart campaign = %v, want the shown campaign %s", h.CampaignID, x3)
	}
}

// F008 A5 (FR-205, FR-206, C04, R11): the summary is the caller's own
// inventory; collectedIcons is the list an open returns as distinctIcons, in
// enum order; completed follows icons_completed_at.
func TestSecretBoxSummaryMatchesTheOpenResult(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	q := db.New(tdb.App)
	ctx := context.Background()
	user, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	giveBoxes(t, tdb, user, 2, "STAY_GOLD", "REVIVAL", "STAY_GOLD", "FLOW_TO_HORIZON", "BEYOND_THE_BOUNDARY", "ROOT_FURTHER")
	giveBoxes(t, tdb, other, 3)

	summary, err := gamification.ReadSecretBoxSummary(ctx, q, user)
	wantBefore := []db.SecretBoxIcon{"REVIVAL", "STAY_GOLD", "FLOW_TO_HORIZON", "BEYOND_THE_BOUNDARY", "ROOT_FURTHER"}
	if err != nil || summary.Unopened != 2 || summary.Opened != 6 || !slices.Equal(summary.CollectedIcons, wantBefore) ||
		summary.TotalIcons != 6 || summary.Completed {
		t.Fatalf("summary = %+v, %v; want 2 unopened, 6 opened, 5 distinct icons in enum order, not completed", summary, err)
	}

	svc := gamification.NewSecretBoxService(tdb.App, &recordingNotifier{}, &scriptedRandom{data: []byte{1}}) // TOUCH_OF_LIGHT
	raw, err := svc.Open(ctx, user, uuid.New())
	if err != nil {
		t.Fatal(err)
	}
	opened := decodeOpen(t, raw)
	after, err := gamification.ReadSecretBoxSummary(ctx, q, user)
	if err != nil {
		t.Fatal(err)
	}
	icons := make([]string, len(after.CollectedIcons))
	for i, icon := range after.CollectedIcons {
		icons[i] = string(icon)
	}
	if !slices.Equal(icons, opened.Summary.DistinctIcons) || !slices.Equal(icons, iconOrder) || !after.Completed ||
		after.Unopened != int32(opened.Summary.Unopened) || after.Opened != int32(opened.Summary.Opened) {
		t.Fatalf("after the completing open: summary %+v, open summary %+v; want the same counts and icons, completed", after, opened.Summary)
	}
	if theirs, err := gamification.ReadSecretBoxSummary(ctx, q, other); err != nil || theirs.Unopened != 3 || len(theirs.CollectedIcons) != 0 {
		t.Fatalf("another Sunner's summary = %+v, %v; want only their own 3 unopened boxes", theirs, err)
	}
}

// F008 A7 (FR-407): a Sunner who just opened a box is listed with that icon.
func TestLatestGiftRecipientsListTheLatestOpen(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	user := tdb.CreateSunner(t, testkit.SunnerSpec{})
	giveBoxes(t, tdb, user, 1, "REVIVAL")
	svc := gamification.NewSecretBoxService(tdb.App, &recordingNotifier{}, &scriptedRandom{data: []byte{5}}) // ROOT_FURTHER
	if _, err := svc.Open(context.Background(), user, uuid.New()); err != nil {
		t.Fatal(err)
	}
	rows, err := gamification.LatestGiftRecipients(context.Background(), db.New(tdb.App), gamification.GiftRecipientsLimit)
	if err != nil || len(rows) == 0 || len(rows) > gamification.GiftRecipientsLimit {
		t.Fatalf("recipients = %+v, %v", rows, err)
	}
	i := slices.IndexFunc(rows, func(r gamification.GiftRecipient) bool { return r.UserID == user })
	if i < 0 || rows[i].Icon == nil || *rows[i].Icon != "ROOT_FURTHER" {
		t.Fatalf("recipients = %+v; want the user with the icon of their latest open", rows)
	}
}
