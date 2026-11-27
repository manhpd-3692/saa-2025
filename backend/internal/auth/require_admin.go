package auth

import (
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// RequireAdmin is the authoritative admin gate for /api/v1/admin/* (F002 A7,
// BR-004): 403 `forbidden` unless the role loaded from users.role for this
// request is admin. It must run inside the PROFILE chain; without an
// AuthContext it fails closed.
func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ac, ok := FromContext(r.Context())
		if !ok {
			slog.ErrorContext(r.Context(), "RequireAdmin used outside the PROFILE chain", "path", r.URL.Path)
		}
		if !ok || !ac.IsAdmin() {
			httpx.WriteError(w, http.StatusForbidden, httpx.CodeForbidden, "Admin role required.")
			return
		}
		next.ServeHTTP(w, r)
	})
}
