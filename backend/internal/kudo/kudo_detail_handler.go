package kudo

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// CodeKudoNotFound answers a missing, non-uuid or not-viewable kudo id alike (BR-006).
const CodeKudoNotFound = "kudo_not_found"

// DetailHandler serves GET /api/v1/kudos/{id} (F006 A7).
type DetailHandler struct {
	reads *ReadService
}

// NewDetailHandler wires the read service.
func NewDetailHandler(reads *ReadService) DetailHandler { return DetailHandler{reads: reads} }

// ServeHTTP answers one KudoCard, or 404 kudo_not_found.
func (h DetailHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
		return
	}
	card, err := h.reads.Get(r.Context(), viewer, id)
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, card)
	case errors.Is(err, ErrKudoNotFound):
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
	default:
		httpx.LogRequestFailure(r, err, "read kudo", "kudo_id", id)
		httpx.WriteInternalError(w)
	}
}

// viewerFrom reads the PROFILE-chain caller; the role comes only from users.role.
func viewerFrom(r *http.Request) (Viewer, bool) {
	ac, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "kudo handler used outside the PROFILE chain", "path", r.URL.Path)
		return Viewer{}, false
	}
	return Viewer{ID: ac.UserID, IsAdmin: ac.IsAdmin()}, true
}
