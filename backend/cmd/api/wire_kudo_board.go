package main

import (
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/user"
)

// F006 Live board reads, all PROFILE: feed (A5), Highlight (A2), filter
// options (A3), Spotlight (A4), sidebar (A6) and the avatar hover card (A9).
// The literal /kudos/<name> patterns are more specific than /kudos/{id}.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		reads := kudo.NewReadService(d.Queries, kudoImageStore(d))
		board := kudo.NewBoardReadService(d.Queries)
		mux.Handle("GET /api/v1/kudos", d.Routes.Profile(kudo.NewListHandler(reads)))
		mux.Handle("GET /api/v1/kudos/highlight", d.Routes.Profile(kudo.NewHighlightHandler(reads)))
		mux.Handle("GET /api/v1/kudos/filter-options", d.Routes.Profile(kudo.NewFilterOptionsHandler(board)))
		mux.Handle("GET /api/v1/kudos/spotlight", d.Routes.Profile(kudo.NewSpotlightHandler(board)))
		mux.Handle("GET /api/v1/kudos/sidebar", d.Routes.Profile(kudo.NewSidebarHandler(board)))
		mux.Handle("GET /api/v1/users/{id}/hover-card", d.Routes.Profile(user.NewHoverCardHandler(d.Queries)))
	})
}
