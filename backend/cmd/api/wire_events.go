package main

import (
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/events"
)

// F003 A3: the one PUBLIC route (no JWT, no profile; Codex N09).
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		h := events.NewHandler(events.NewService(d.Queries, time.Now))
		mux.Handle("GET /api/v1/events/current", d.Routes.Public(h))
	})
}
