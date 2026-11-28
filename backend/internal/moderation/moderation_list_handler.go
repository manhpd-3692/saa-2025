package moderation

import (
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
)

// adminCaller reads the ADMIN-chain caller (RequireAdmin on users.role,
// BR-007, Codex R05). A handler mounted outside that chain refuses with 403
// instead of serving real senders or decisions to anyone.
func adminCaller(w http.ResponseWriter, r *http.Request) (auth.AuthContext, bool) {
	caller, ok := auth.FromContext(r.Context())
	if !ok || !caller.IsAdmin() {
		slog.ErrorContext(r.Context(), "moderation handler used outside the ADMIN chain", "path", r.URL.Path)
		httpx.WriteError(w, http.StatusForbidden, httpx.CodeForbidden, "Admin role required.")
		return auth.AuthContext{}, false
	}
	return caller, true
}

// NewListHandler serves GET /api/v1/admin/kudos?sender&receiver&status&from&to&q&page
// (A1): one page of every kudo newest first with the match count and the
// applied filters; invalid values are dropped (BR-005), under the 5 s deadline.
func NewListHandler(reviews *ReviewService) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		caller, ok := adminCaller(w, r)
		if !ok {
			return
		}
		query := r.URL.Query()
		viewer := kudo.Viewer{ID: caller.UserID, IsAdmin: caller.IsAdmin()}
		page, err := reviews.List(r.Context(), viewer, ParseReviewFilter(query), ParseReviewPage(query))
		if err != nil {
			httpx.LogRequestFailure(r, err, "read admin review list")
			httpx.WriteInternalError(w)
			return
		}
		httpx.WriteJSON(w, http.StatusOK, page)
	})
}
