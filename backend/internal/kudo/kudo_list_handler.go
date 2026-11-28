package kudo

import (
	"net/http"
	"strconv"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// CodeInvalidCursor answers a feed cursor that was not issued by the API.
const CodeInvalidCursor = "invalid_cursor"

// ListHandler serves GET /api/v1/kudos?cursor=&limit= (F006 A5, ALG-001).
type ListHandler struct {
	reads *ReadService
}

// NewListHandler wires the read service.
func NewListHandler(reads *ReadService) ListHandler { return ListHandler{reads: reads} }

// ServeHTTP answers one page of the All Kudos feed as {items, nextCursor}.
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
			httpx.WriteError(w, http.StatusBadRequest, CodeInvalidCursor, "The feed cursor is not valid.")
			return
		}
		after = &cursor
	}
	page, err := h.reads.List(r.Context(), viewer, after, feedLimit(query.Get("limit")))
	if err != nil {
		httpx.LogRequestFailure(r, err, "list kudos")
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, page)
}

// feedLimit is `limit` clamped to 1..FeedMaxPageSize (default FeedPageSize).
func feedLimit(raw string) int {
	n, err := strconv.Atoi(raw)
	switch {
	case err != nil || n <= 0:
		return FeedPageSize
	case n > FeedMaxPageSize:
		return FeedMaxPageSize
	}
	return n
}
