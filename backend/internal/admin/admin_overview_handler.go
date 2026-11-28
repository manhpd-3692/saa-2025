package admin

import (
	"context"
	"net/http"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// NewOverviewHandler serves GET /api/v1/admin/overview?from&to (A1): the
// Overview for the range, the default range when the address has none or an
// invalid one (FR-104), under the 5 s request deadline (R23).
func NewOverviewHandler(service *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rng := ParseDateRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), time.Now())
		ctx, cancel := dbx.RequestContext(r.Context())
		defer cancel()
		overview, err := service.Overview(ctx, rng)
		if err != nil {
			httpx.LogRequestFailure(r, err, "read admin overview", "from", rng.FromDay(), "to", rng.ToDay())
			httpx.WriteInternalError(w)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, overview)
	})
}

// NewOverviewExportHandler serves GET /api/v1/admin/overview/export?from&to
// (A3): the same Overview as A1 for the same range as a CSV file
// `saa-overview-{from}_{to}.csv` (ALG-002), under the 20 s export deadline
// (R23). The aggregated table is the first and only page (Codex N11).
func NewOverviewExportHandler(service *Service) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rng := ParseDateRange(r.URL.Query().Get("from"), r.URL.Query().Get("to"), time.Now())
		ctx, cancel := context.WithTimeout(r.Context(), dbx.ExportTimeout)
		defer cancel()
		read := false
		filename := "saa-overview-" + rng.FromDay() + "_" + rng.ToDay() + ".csv"
		streamCSV(ctx, w, r, filename, overviewCSVHeader, func(ctx context.Context) ([][]string, error) {
			if read {
				return nil, nil
			}
			read = true
			overview, err := service.Overview(ctx, rng)
			if err != nil {
				return nil, err
			}
			return overviewCSVRecords(overview), nil
		})
	})
}
