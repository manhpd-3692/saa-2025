package main

import (
	"github.com/manhpd-3692/saa-2025/backend/internal/moderation"
)

// F011 A1/A2: the Review content list and the Sender / Receiver options, ADMIN
// (PROFILE + RequireAdmin, BR-007): 401 without a valid token, 403 for a
// user-role caller, before any query runs.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		reviews := moderation.NewReviewService(d.Queries)
		mux.Handle("GET /api/v1/admin/kudos", d.Routes.Admin(moderation.NewListHandler(reviews)))
		mux.Handle("GET /api/v1/admin/kudos/people", d.Routes.Admin(moderation.NewPeopleHandler(reviews)))
	})
}
