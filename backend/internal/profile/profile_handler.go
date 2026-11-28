package profile

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/user"
)

// Handler serves GET /api/v1/users/{id}/profile (F007 A1, A2).
type Handler struct {
	service *Service
}

// NewHandler wires the profile service.
func NewHandler(service *Service) Handler { return Handler{service: service} }

// ServeHTTP answers the profile, or 404 user_not_found for a non-uuid or
// unknown id. Counts that could not be read still answer 200 (Codex R15);
// the cause is logged here.
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeUserNotFound(w)
		return
	}
	profile, err := h.service.Get(r.Context(), viewer, id)
	switch {
	case errors.Is(err, ErrUserNotFound):
		writeUserNotFound(w)
		return
	case err != nil:
		httpx.LogRequestFailure(r, err, "read profile", "user_id", id)
		httpx.WriteInternalError(w)
		return
	}
	if profile.degraded != nil {
		httpx.LogRequestFailure(r, profile.degraded, "read profile counts (answered countsUnavailable)", "user_id", id)
	}
	httpx.WriteJSON(w, http.StatusOK, profile)
}

// viewerFrom reads the PROFILE-chain caller; the role comes only from users.role.
func viewerFrom(r *http.Request) (kudo.Viewer, bool) {
	ac, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "profile handler used outside the PROFILE chain", "path", r.URL.Path)
		return kudo.Viewer{}, false
	}
	return kudo.Viewer{ID: ac.UserID, IsAdmin: ac.IsAdmin()}, true
}

func writeUserNotFound(w http.ResponseWriter) {
	httpx.WriteError(w, http.StatusNotFound, user.CodeUserNotFound, "User not found.")
}
