package admin

import (
	"context"
	"net/http"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// NewUsersHandler serves GET /api/v1/admin/users?unit&level&role&q&page&pageSize
// (A4, and A5 with a small pageSize): one page of the directory ordered by
// name with the match count and the Unit choices, under the 5 s deadline.
func NewUsersHandler(service *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		filter := ParseUserFilter(r.URL.Query())
		page, pageSize := ParsePaging(r.URL.Query())
		ctx, cancel := dbx.RequestContext(r.Context())
		defer cancel()
		users, err := service.Users(ctx, filter, page, pageSize)
		if err != nil {
			httpx.LogRequestFailure(r, err, "read admin user directory")
			httpx.WriteInternalError(w)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, users)
	})
}

// NewUsersExportHandler serves GET /api/v1/admin/users/export?unit&level&role&q
// (A6): every match of the filters, not one page (FR-403), streamed as
// `saa-users-{YYYY-MM-DD}.csv` (ALG-002, Codex N11) under the 20 s export
// deadline (R23).
func NewUsersExportHandler(service *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		filter := ParseUserFilter(r.URL.Query())
		ctx, cancel := context.WithTimeout(r.Context(), dbx.ExportTimeout)
		defer cancel()
		pages := service.userExportPages(filter)
		filename := "saa-users-" + ReportToday(time.Now()).Format(reportDateLayout) + ".csv"
		streamCSV(ctx, w, r, filename, usersCSVHeader, func(ctx context.Context) ([][]string, error) {
			users, err := pages(ctx)
			if err != nil {
				return nil, err
			}
			return usersCSVRecords(users), nil
		})
	})
}
