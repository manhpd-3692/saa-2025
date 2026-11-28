package kudo

import (
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// FilterOptionsHandler serves GET /api/v1/kudos/filter-options (F006 A3).
type FilterOptionsHandler struct {
	board *BoardReadService
}

// NewFilterOptionsHandler wires the board reads.
func NewFilterOptionsHandler(board *BoardReadService) FilterOptionsHandler {
	return FilterOptionsHandler{board: board}
}

// ServeHTTP answers {hashtags: [{id, name}], units: [{id, name, code}]}.
func (h FilterOptionsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	options, err := h.board.FilterOptions(r.Context())
	if err != nil {
		slog.ErrorContext(r.Context(), "read kudo filter options", "error", err)
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, options)
}
