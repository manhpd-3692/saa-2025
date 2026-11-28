//go:build integration

package main

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F008 A5 through the router (FR-205, FR-206, FR-602, C04): the caller's own
// summary in the documented shape, never another Sunner's.
func TestSecretBoxSummaryThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	user, token := h.sunner(testkit.SunnerSpec{})
	other, _ := h.sunner(testkit.SunnerSpec{})
	ctx := context.Background()
	for _, row := range []struct {
		user   any
		seq    int
		opened bool
	}{{user, 1, true}, {user, 2, false}, {other, 1, false}, {other, 2, false}} {
		icon := "null"
		if row.opened {
			icon = "'STAY_GOLD'"
		}
		if _, err := h.db.Owner.Exec(ctx, `insert into public.secret_boxes (user_id, seq, opened_at, icon)
			values ($1, $2, case when `+icon+` is null then null else now() end, `+icon+`)`, row.user, row.seq); err != nil {
			t.Fatal(err)
		}
	}
	got := h.do(http.MethodGet, "/api/v1/me/secret-boxes", token, nil)
	want := `{"unopened":1,"opened":1,"collectedIcons":["STAY_GOLD"],"totalIcons":6,"completed":false}`
	if got.Status != http.StatusOK || strings.TrimSpace(string(got.Body)) != want {
		t.Fatalf("GET /me/secret-boxes = %d %s, want %s", got.Status, got.Body, want)
	}
	if anon := h.do(http.MethodGet, "/api/v1/me/secret-boxes", "", nil); anon.Status != http.StatusUnauthorized {
		t.Fatalf("without a token = %d, want 401", anon.Status)
	}
}

// F008 A3 through the router: PROFILE route answering null or the campaign shape.
// Other packages' suites create and clear campaigns concurrently, so only the
// shape is checked here; the values are covered in internal/gamification.
func TestActiveCampaignThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	_, token := h.sunner(testkit.SunnerSpec{})
	got := h.do(http.MethodGet, "/api/v1/campaigns/active", token, nil)
	if got.Status != http.StatusOK {
		t.Fatalf("GET /campaigns/active = %d %s", got.Status, got.Body)
	}
	if body := strings.TrimSpace(string(got.Body)); body != "null" {
		campaign := got.json(t)
		multiplier, _ := campaign["multiplier"].(float64)
		if campaign["name"] == nil || multiplier < 2 || multiplier > 10 || campaign["startsAt"] == nil || campaign["endsAt"] == nil {
			t.Fatalf("active campaign = %s, want {name, multiplier 2..10, startsAt, endsAt}", body)
		}
	}
	if anon := h.do(http.MethodGet, "/api/v1/campaigns/active", "", nil); anon.Status != http.StatusUnauthorized {
		t.Fatalf("without a token = %d, want 401", anon.Status)
	}
}
