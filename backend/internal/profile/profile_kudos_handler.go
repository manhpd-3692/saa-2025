package profile

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
)

// KudosHandler serves GET /api/v1/users/{id}/kudos?filter=received|sent&cursor= (F007 A3).
type KudosHandler struct {
	service *Service
}

// NewKudosHandler wires the profile service.
func NewKudosHandler(service *Service) KudosHandler { return KudosHandler{service: service} }

// ServeHTTP answers one page as {items, nextCursor}: 400 for a missing or
// unknown filter and for a cursor not issued for this filter, 404 for a
// non-uuid or unknown id.
func (h KudosHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
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
	query := r.URL.Query()
	filter, ok := ParseFilter(query.Get("filter"))
	if !ok {
		httpx.WriteError(w, http.StatusBadRequest, kudo.CodeInvalidFilter, "filter must be received or sent.")
		return
	}
	page, err := h.service.ListKudos(r.Context(), viewer, id, filter, query.Get("cursor"))
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, page)
	case errors.Is(err, ErrInvalidCursor):
		httpx.WriteError(w, http.StatusBadRequest, kudo.CodeInvalidCursor, "The list cursor is not valid.")
	case errors.Is(err, ErrUserNotFound):
		writeUserNotFound(w)
	default:
		httpx.LogRequestFailure(r, err, "list profile kudos", "user_id", id, "filter", filter)
		httpx.WriteInternalError(w)
	}
}
