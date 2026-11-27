package main

import (
	"log/slog"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/manhpd-3692/saa-2025/backend/internal/config"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// apiDeps is everything a capability needs to build and register its handlers.
type apiDeps struct {
	Config  config.Config
	Logger  *slog.Logger
	Pool    *pgxpool.Pool
	Queries *db.Queries
	// Routes wraps each handler in exactly one route class (F002 § 4.4 A0).
	Routes httpx.RouteClasses
}

// routeMux is the part of *http.ServeMux a capability registers routes on; an
// interface so tests can record every registered pattern (route-class guard).
type routeMux interface {
	Handle(pattern string, handler http.Handler)
}

// routeRegistration registers one capability's routes on the shared mux using
// Go 1.22+ method patterns, e.g. mux.Handle("GET /api/v1/me", d.Routes.Profile(h)).
type routeRegistration func(mux routeMux, deps apiDeps)

// routeRegistrations is filled by package-level init functions in
// wire_<capability>.go files — one file per capability, so phases never edit a
// shared routes list (see backend/README.md "Adding routes").
var routeRegistrations []routeRegistration

// registerRoutes is called from a wire_<capability>.go init function.
func registerRoutes(r routeRegistration) {
	routeRegistrations = append(routeRegistrations, r)
}

// newRouter builds the mux from the registrations and wraps it whole in CORS
// (outermost, so it runs before every route-class chain and decorates even a
// panic 500) around Recover (Codex R06, N09, review W2).
func newRouter(deps apiDeps, registrations []routeRegistration) http.Handler {
	mux := http.NewServeMux()
	for _, register := range registrations {
		register(mux, deps)
	}
	return httpx.CORS(deps.Config.FrontendOrigins)(httpx.Recover(mux))
}
