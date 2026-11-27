package main

import (
	"log/slog"

	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// F005 A4: signed upload URL for one kudo image (PROFILE).
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		h := upload.NewUploadHandler(d.Queries, kudoImageStore(d))
		mux.Handle("POST /api/v1/uploads/kudo-images", d.Routes.Profile(h))
	})
}

// kudoImageStore needs the Storage service key (phase-01 carry-over 3): the
// upload service refuses to start without it, while the API still boots and
// image operations fail closed (503 storage_unavailable).
func kudoImageStore(d apiDeps) upload.ObjectStore {
	store, err := upload.NewStorageObjectStore(d.Config.SupabaseURL, d.Config.SupabaseServiceKey)
	if err != nil {
		slog.Error("kudo image storage disabled", "error", err)
		return upload.UnavailableObjectStore{}
	}
	return store
}
