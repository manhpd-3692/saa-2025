package gamification_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

type fixedCampaigns struct {
	campaign *gamification.ActiveCampaign
	err      error
}

func (f fixedCampaigns) ActiveCampaign(context.Context) (*gamification.ActiveCampaign, error) {
	return f.campaign, f.err
}

// F008 A3 (FR-204, US004, Codex R09): "none" and "failed" are distinct answers —
// null with 200 versus 500 campaign_lookup_failed, which only hides the badge.
func TestActiveCampaignHandlerAnswers(t *testing.T) {
	starts := time.Date(2026, 11, 28, 0, 0, 0, 0, time.UTC)
	cases := []struct {
		name       string
		source     fixedCampaigns
		wantStatus int
		wantBody   string
	}{
		{"no active campaign", fixedCampaigns{}, http.StatusOK, "null"},
		{"lookup fails", fixedCampaigns{err: errors.New("db down")}, http.StatusInternalServerError, `"code":"campaign_lookup_failed"`},
		{"active campaign", fixedCampaigns{campaign: &gamification.ActiveCampaign{
			Name: "Ngày x2 tim", Multiplier: 2, StartsAt: starts, EndsAt: starts.Add(24 * time.Hour),
		}}, http.StatusOK, `{"name":"Ngày x2 tim","multiplier":2,"startsAt":"2026-11-28T00:00:00Z","endsAt":"2026-11-29T00:00:00Z"}`},
	}
	for _, tc := range cases {
		rec := httptest.NewRecorder()
		gamification.NewActiveCampaignHandler(tc.source).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/campaigns/active", nil))
		body := strings.TrimSpace(rec.Body.String())
		if rec.Code != tc.wantStatus || !strings.Contains(body, tc.wantBody) {
			t.Errorf("%s: %d %s, want %d containing %s", tc.name, rec.Code, body, tc.wantStatus, tc.wantBody)
		}
		if tc.wantStatus == http.StatusOK && !json.Valid([]byte(body)) {
			t.Errorf("%s: body is not JSON: %s", tc.name, body)
		}
	}
}
