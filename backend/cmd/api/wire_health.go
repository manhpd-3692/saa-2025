package main

import (
	"context"
	"net/http"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Operational liveness probe outside /api/v1 (not a business route, so it is
// not part of the F002 route-class list). Also the reference example of the
// wire_<capability>.go pattern.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		mux.Handle("GET /healthz", d.Routes.Public(healthHandler(d.Pool)))
	})
}

type pinger interface {
	Ping(ctx context.Context) error
}

const healthPingTimeout = 2 * time.Second

func healthHandler(db pinger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), healthPingTimeout)
		defer cancel()
		if err := db.Ping(ctx); err != nil {
			httpx.WriteError(w, http.StatusServiceUnavailable, "database_unavailable", "Database is unreachable.")
			return
		}
		httpx.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
