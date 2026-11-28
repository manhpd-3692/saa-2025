package kudo

import (
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// SidebarHandler serves GET /api/v1/kudos/sidebar (F006 A6).
type SidebarHandler struct {
	board *BoardReadService
}

// NewSidebarHandler wires the board reads.
func NewSidebarHandler(board *BoardReadService) SidebarHandler { return SidebarHandler{board: board} }

// ServeHTTP answers the signed-in viewer's stats (never a query parameter's
// user) and the latest gift recipients.
func (h SidebarHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	sidebar, err := h.board.Sidebar(r.Context(), viewer)
	if err != nil {
		slog.ErrorContext(r.Context(), "read board sidebar", "error", err)
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, sidebar)
}
