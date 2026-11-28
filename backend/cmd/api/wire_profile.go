package main

import (
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/profile"
)

// F007 Sunner profiles, both PROFILE: the profile header with its counts
// (A1/A2) and one page of the received or sent kudo list (A3).
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		profiles := profile.NewService(d.Queries, kudo.NewReadService(d.Queries, kudoImageStore(d)))
		mux.Handle("GET /api/v1/users/{id}/profile", d.Routes.Profile(profile.NewHandler(profiles)))
		mux.Handle("GET /api/v1/users/{id}/kudos", d.Routes.Profile(profile.NewKudosHandler(profiles)))
	})
}
