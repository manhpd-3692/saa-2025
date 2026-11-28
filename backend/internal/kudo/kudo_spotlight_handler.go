package kudo

import (
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// SpotlightHandler serves GET /api/v1/kudos/spotlight (F006 A4).
type SpotlightHandler struct {
	board *BoardReadService
}

// NewSpotlightHandler wires the board reads.
func NewSpotlightHandler(board *BoardReadService) SpotlightHandler {
	return SpotlightHandler{board: board}
}

// ServeHTTP answers {total, names, recent}; search runs on the client (BR-004).
func (h SpotlightHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	spotlight, err := h.board.Spotlight(r.Context())
	if err != nil {
		slog.ErrorContext(r.Context(), "read spotlight", "error", err)
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, spotlight)
}
