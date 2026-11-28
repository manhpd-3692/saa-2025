package main

import "github.com/manhpd-3692/saa-2025/backend/internal/notification"

// F009 notification center, all PROFILE: unread count (A2), list (A4), mark
// one read (A6) and read all (A7). No route creates, edits or deletes a
// notification (FR-602): producers call notification.Service in process.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		reads := notification.NewReadService(d.Queries)
		mux.Handle("GET /api/v1/me/notifications", d.Routes.Profile(notification.NewListHandler(reads)))
		mux.Handle("GET /api/v1/me/notifications/unread-count", d.Routes.Profile(notification.NewUnreadCountHandler(reads)))
		mux.Handle("POST /api/v1/me/notifications/read-all", d.Routes.Profile(notification.NewMarkAllReadHandler(reads)))
		mux.Handle("POST /api/v1/me/notifications/{id}/read", d.Routes.Profile(notification.NewMarkReadHandler(reads)))
	})
}
