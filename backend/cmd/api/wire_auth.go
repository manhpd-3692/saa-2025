package main

import (
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
)

// F002 A8 (PROFILE) and A9 (the one IDENTITY-ONLY route, Codex N09).
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		profiles := auth.NewProfileService(d.Pool, d.Queries, identityReader(d), d.Config.AdminEmails)
		h := auth.NewMeHandler(profiles)
		mux.Handle("GET /api/v1/me", d.Routes.Profile(http.HandlerFunc(h.Get)))
		mux.Handle("POST /api/v1/me/provision", d.Routes.Identity(http.HandlerFunc(h.Provision)))
	})
}

// identityReader needs the service key (gap log C08); without it the API still
// boots and provisioning fails closed with 500.
func identityReader(d apiDeps) auth.IdentityReader {
	reader, err := auth.NewSupabaseIdentityReader(d.Config.SupabaseURL, d.Config.SupabaseServiceKey)
	if err != nil {
		slog.Error("profile provisioning disabled", "error", err)
		return auth.UnavailableIdentityReader{}
	}
	return reader
}
