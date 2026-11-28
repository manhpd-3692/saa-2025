package main

import (
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
	"github.com/manhpd-3692/saa-2025/backend/internal/user"
)

// F005 compose: recipient/mention search (A2), hashtag list (A3), edit prefill
// (A6), edit (A7) and unsaved-upload deletion (A8), all PROFILE.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		store := kudoImageStore(d)
		edit := kudo.NewUpdateService(d.Pool, d.Queries, upload.NewAttachmentFinalizer(store),
			upload.NewAsyncCleaner(upload.NewStorageCleaner(d.Queries, store)), store)
		mux.Handle("GET /api/v1/users/search", d.Routes.Profile(user.NewSearchHandler(d.Queries)))
		mux.Handle("GET /api/v1/hashtags", d.Routes.Profile(kudo.NewHashtagListHandler(d.Queries)))
		mux.Handle("GET /api/v1/kudos/{id}/edit", d.Routes.Profile(kudo.NewEditHandler(edit)))
		mux.Handle("PATCH /api/v1/kudos/{id}", d.Routes.Profile(kudo.NewUpdateHandler(edit)))
		mux.Handle("DELETE /api/v1/uploads/{uploadId}", d.Routes.Profile(upload.NewUploadDeleteHandler(d.Pool, store)))
	})
}
