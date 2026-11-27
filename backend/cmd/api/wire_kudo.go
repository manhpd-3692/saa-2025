package main

import (
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// F005 A5 (create) and F006 A7 (detail read), both PROFILE.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		store := kudoImageStore(d)
		create := kudo.NewCreateService(d.Pool, d.Queries, upload.NewAttachmentFinalizer(store), notification.NewService(d.Pool))
		mux.Handle("POST /api/v1/kudos", d.Routes.Profile(kudo.NewCreateHandler(create)))
		mux.Handle("GET /api/v1/kudos/{id}", d.Routes.Profile(kudo.NewDetailHandler(kudo.NewReadService(d.Queries, store))))
	})
}
