package main

import "github.com/manhpd-3692/saa-2025/backend/internal/gamification"

// F008 reads, both PROFILE: the active campaign for the badge (A3; a failure
// only hides the badge, R09) and the caller's own secret-box summary (A5).
// The latest gift recipients (A7) and tiers (A4) reach the browser inside the
// F006 board responses.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		campaigns := gamification.DBActiveCampaigns{Queries: d.Queries}
		mux.Handle("GET /api/v1/campaigns/active", d.Routes.Profile(gamification.NewActiveCampaignHandler(campaigns)))
		mux.Handle("GET /api/v1/me/secret-boxes", d.Routes.Profile(gamification.NewSecretBoxSummaryHandler(d.Queries)))
	})
}
