package gamification

import (
	"context"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// ActiveCampaignSource reads the campaign the badge shows (A3).
type ActiveCampaignSource interface {
	ActiveCampaign(ctx context.Context) (*ActiveCampaign, error)
}

// DBActiveCampaigns is the A3 read over the shared INT-001 lookup, so the badge
// shows the multiplier the heart transaction applies (BR-004).
type DBActiveCampaigns struct {
	Queries *db.Queries
}

// ActiveCampaign runs the lookup under the per-request deadline (R23).
func (s DBActiveCampaigns) ActiveCampaign(ctx context.Context) (*ActiveCampaign, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	return LookupActiveCampaign(ctx, s.Queries)
}

// ActiveCampaignHandler serves GET /api/v1/campaigns/active (F008 A3, FR-204).
type ActiveCampaignHandler struct {
	source ActiveCampaignSource
}

// NewActiveCampaignHandler wires the campaign source.
func NewActiveCampaignHandler(source ActiveCampaignSource) ActiveCampaignHandler {
	return ActiveCampaignHandler{source: source}
}

// ServeHTTP answers {name, multiplier, startsAt, endsAt}, or null when no
// campaign is active. A failed lookup answers 500, distinct from "none": the
// client then only hides the badge; hearts do their own lookup (Codex R09).
func (h ActiveCampaignHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	campaign, err := h.source.ActiveCampaign(r.Context())
	if err != nil {
		httpx.LogRequestFailure(r, err, "read active campaign for the badge")
		httpx.WriteError(w, http.StatusInternalServerError, CodeCampaignLookupFailed, "The active campaign could not be read.")
		return
	}
	httpx.WriteJSON(w, http.StatusOK, campaign)
}
