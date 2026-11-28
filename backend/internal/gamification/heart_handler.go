package gamification

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes of the heart endpoints (F008 DEC-002, Codex R09).
const (
	CodeKudoNotFound         = "kudo_not_found"
	CodeCannotHeartOwnKudo   = "cannot_heart_own_kudo"
	CodeKudoNotPublic        = "kudo_not_public"
	CodeCampaignLookupFailed = "campaign_lookup_failed"
)

// HeartHandler serves PUT (give) and DELETE (withdraw) /api/v1/kudos/{id}/heart.
type HeartHandler struct {
	service *HeartService
	hearted bool
}

// NewHeartPutHandler gives the viewer's heart.
func NewHeartPutHandler(service *HeartService) HeartHandler {
	return HeartHandler{service: service, hearted: true}
}

// NewHeartDeleteHandler withdraws the viewer's heart.
func NewHeartDeleteHandler(service *HeartService) HeartHandler {
	return HeartHandler{service: service, hearted: false}
}

// ServeHTTP runs behind the PROFILE chain; the viewer comes only from the verified token.
func (h HeartHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "heart handler used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	kudoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
		return
	}
	state, err := h.service.Set(r.Context(), viewer.UserID, kudoID, h.hearted)
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, state)
	case errors.Is(err, ErrKudoNotFound):
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
	case errors.Is(err, ErrCannotHeartOwn):
		httpx.WriteError(w, http.StatusForbidden, CodeCannotHeartOwnKudo, "You cannot heart a kudo you sent.")
	case errors.Is(err, ErrKudoNotPublic):
		httpx.WriteError(w, http.StatusConflict, CodeKudoNotPublic, "Hearts are accepted on public kudos only.")
	case errors.Is(err, ErrCampaignLookup) && !httpx.CanceledByCaller(r, err):
		httpx.LogRequestFailure(r, err, "heart campaign lookup", "kudo_id", kudoID)
		httpx.WriteError(w, http.StatusInternalServerError, CodeCampaignLookupFailed, "The heart was not recorded; please retry.")
	default:
		httpx.LogRequestFailure(r, err, "set heart", "kudo_id", kudoID)
		httpx.WriteInternalError(w)
	}
}
