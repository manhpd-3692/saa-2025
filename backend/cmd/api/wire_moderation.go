package main

import (
	"github.com/manhpd-3692/saa-2025/backend/internal/moderation"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
)

// F011 A3/A4: versioned Spam/Public decisions (ADMIN: PROFILE + RequireAdmin).
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		service := moderation.NewService(d.Pool, notification.NewService(d.Pool))
		mux.Handle("POST /api/v1/admin/kudos/{id}/spam", d.Routes.Admin(moderation.NewSpamHandler(service)))
		mux.Handle("POST /api/v1/admin/kudos/{id}/public", d.Routes.Admin(moderation.NewPublicHandler(service)))
	})
}
