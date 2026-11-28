package gamification

import (
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// SecretBoxSummaryHandler serves GET /api/v1/me/secret-boxes (F008 A5).
type SecretBoxSummaryHandler struct {
	queries *db.Queries
}

// NewSecretBoxSummaryHandler wires the pool queries.
func NewSecretBoxSummaryHandler(queries *db.Queries) SecretBoxSummaryHandler {
	return SecretBoxSummaryHandler{queries: queries}
}

// ServeHTTP answers the signed-in caller's own inventory only (FR-602): the
// user comes from the verified token, never from the request.
func (h SecretBoxSummaryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "secret box summary handler used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	ctx, cancel := dbx.RequestContext(r.Context())
	defer cancel()
	summary, err := ReadSecretBoxSummary(ctx, h.queries, viewer.UserID)
	if err != nil {
		httpx.LogRequestFailure(r, err, "read secret box summary", "user_id", viewer.UserID)
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, summary)
}
