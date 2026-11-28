package notification

import (
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// MarkReadHandler serves POST /api/v1/me/notifications/{id}/read (F009 A6).
type MarkReadHandler struct {
	reads *ReadService
}

// NewMarkReadHandler wires the read service.
func NewMarkReadHandler(reads *ReadService) MarkReadHandler { return MarkReadHandler{reads: reads} }

// ServeHTTP answers 204; a malformed, unknown or foreign id is the same 404
// notification_not_found (BR-001), so ids cannot be probed.
func (h MarkReadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		writeNotificationNotFound(w)
		return
	}
	switch err := h.reads.MarkRead(r.Context(), viewer.ID, id); {
	case errors.Is(err, ErrNotFound):
		writeNotificationNotFound(w)
	case err != nil:
		httpx.LogRequestFailure(r, err, "mark notification read", "notification_id", id)
		httpx.WriteInternalError(w)
	default:
		w.Header().Set("Cache-Control", "no-store")
		w.WriteHeader(http.StatusNoContent)
	}
}

// MarkAllReadHandler serves POST /api/v1/me/notifications/read-all (F009 A7).
type MarkAllReadHandler struct {
	reads *ReadService
}

// NewMarkAllReadHandler wires the read service.
func NewMarkAllReadHandler(reads *ReadService) MarkAllReadHandler {
	return MarkAllReadHandler{reads: reads}
}

// ServeHTTP answers {markedRead}: how many unread notices became read.
func (h MarkAllReadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	n, err := h.reads.MarkAllRead(r.Context(), viewer.ID)
	if err != nil {
		httpx.LogRequestFailure(r, err, "mark all notifications read")
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]int64{"markedRead": n})
}

func writeNotificationNotFound(w http.ResponseWriter) {
	httpx.WriteError(w, http.StatusNotFound, CodeNotificationNotFound, "Notification not found.")
}
