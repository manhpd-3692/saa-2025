package events

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// CodeEventNotFound answers when no event row exists (F003 D003).
const CodeEventNotFound = "event_not_found"

// Handler serves GET /api/v1/events/current, the one PUBLIC route (N09).
type Handler struct {
	service *Service
}

// NewHandler wires the service.
func NewHandler(service *Service) Handler { return Handler{service: service} }

// ServeHTTP answers 200 with the event, 404 without a row, 500 on a database
// error or the 5 s deadline (R23). Responses are never cached (no-store).
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	event, err := h.service.Current(r.Context())
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, event)
	case errors.Is(err, ErrNoEvent):
		httpx.WriteError(w, http.StatusNotFound, CodeEventNotFound, "No event is configured.")
	case r.Context().Err() != nil && errors.Is(err, context.Canceled):
		// The caller went away first, e.g. the Next.js launch gate gives up after
		// 1.5 s and fails open (F003 A1, R23): a slow read, not a server fault.
		// Any other error stays ERROR even when the caller has also gone, so a
		// database outage slower than the gate's deadline is still alerted on.
		slog.WarnContext(r.Context(), "current event request cancelled by the caller", "error", err)
		httpx.WriteInternalError(w)
	default:
		slog.ErrorContext(r.Context(), "read current event", "error", err)
		httpx.WriteInternalError(w)
	}
}
