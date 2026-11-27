package main

import (
	"crypto/rand"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
)

// F008 A1 (heart PUT/DELETE) and A6 (secret box open), all PROFILE.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		notifier := notification.NewService(d.Pool)
		hearts := gamification.NewHeartService(d.Pool, gamification.DBCampaignReader{}, notifier)
		mux.Handle("PUT /api/v1/kudos/{id}/heart", d.Routes.Profile(gamification.NewHeartPutHandler(hearts)))
		mux.Handle("DELETE /api/v1/kudos/{id}/heart", d.Routes.Profile(gamification.NewHeartDeleteHandler(hearts)))
		boxes := gamification.NewSecretBoxService(d.Pool, notifier, rand.Reader)
		mux.Handle("POST /api/v1/me/secret-boxes/open", d.Routes.Profile(gamification.NewSecretBoxOpenHandler(boxes)))
	})
}
