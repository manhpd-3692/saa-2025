package notification

import (
	"log/slog"
	"net/http"
	"strconv"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes of the notification endpoints.
const (
	CodeInvalidCursor        = "invalid_cursor"
	CodeNotificationNotFound = "notification_not_found"
)

// ListHandler serves GET /api/v1/me/notifications?cursor=&limit= (F009 A4).
type ListHandler struct {
	reads *ReadService
}

// NewListHandler wires the read service.
func NewListHandler(reads *ReadService) ListHandler { return ListHandler{reads: reads} }

// ServeHTTP answers one page of the caller's notices as {items, nextCursor};
// 400 invalid_cursor for a cursor the API did not issue.
func (h ListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	query := r.URL.Query()
	var after *Cursor
	if raw := query.Get("cursor"); raw != "" {
		cursor, err := DecodeCursor(raw)
		if err != nil {
			httpx.WriteError(w, http.StatusBadRequest, CodeInvalidCursor, "The list cursor is not valid.")
			return
		}
		after = &cursor
	}
	page, err := h.reads.List(r.Context(), viewer, after, pageLimit(query.Get("limit")))
	if err != nil {
		httpx.LogRequestFailure(r, err, "list notifications")
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, page)
}

// UnreadCountHandler serves GET /api/v1/me/notifications/unread-count (F009 A2).
type UnreadCountHandler struct {
	reads *ReadService
}

// NewUnreadCountHandler wires the read service.
func NewUnreadCountHandler(reads *ReadService) UnreadCountHandler {
	return UnreadCountHandler{reads: reads}
}

// ServeHTTP answers {unreadCount}; the bell keeps its last state on a failure.
func (h UnreadCountHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	n, err := h.reads.UnreadCount(r.Context(), viewer.ID)
	if err != nil {
		httpx.LogRequestFailure(r, err, "count unread notifications")
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]int64{"unreadCount": n})
}

// viewerFrom reads the PROFILE-chain caller; the role comes only from users.role.
func viewerFrom(r *http.Request) (Viewer, bool) {
	ac, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "notification handler used outside the PROFILE chain", "path", r.URL.Path)
		return Viewer{}, false
	}
	return Viewer{ID: ac.UserID, IsAdmin: ac.IsAdmin()}, true
}

// pageLimit is `limit` clamped to 1..MaxPageSize (default PageSize).
func pageLimit(raw string) int {
	n, err := strconv.Atoi(raw)
	switch {
	case err != nil || n <= 0:
		return PageSize
	case n > MaxPageSize:
		return MaxPageSize
	}
	return n
}
