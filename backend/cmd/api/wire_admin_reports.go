package main

import (
	"github.com/manhpd-3692/saa-2025/backend/internal/admin"
)

// F010 admin Overview and user directory with their CSV exports, all ADMIN
// (PROFILE + RequireAdmin, BR-007): 401 without a valid token, 403 for a
// user-role caller, before any query runs.
func init() {
	registerRoutes(func(mux routeMux, d apiDeps) {
		reports := admin.NewService(d.Queries)
		mux.Handle("GET /api/v1/admin/overview", d.Routes.Admin(admin.NewOverviewHandler(reports)))
		mux.Handle("GET /api/v1/admin/overview/export", d.Routes.Admin(admin.NewOverviewExportHandler(reports)))
		mux.Handle("GET /api/v1/admin/users", d.Routes.Admin(admin.NewUsersHandler(reports)))
		mux.Handle("GET /api/v1/admin/users/export", d.Routes.Admin(admin.NewUsersExportHandler(reports)))
	})
}
