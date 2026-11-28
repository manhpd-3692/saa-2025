package kudo

import (
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// CodeInvalidFilter answers a hashtagId or unitId that is not a uuid.
const CodeInvalidFilter = "invalid_filter"

// HighlightHandler serves GET /api/v1/kudos/highlight?hashtagId=&unitId= (F006 A2).
type HighlightHandler struct {
	reads *ReadService
}

// NewHighlightHandler wires the read service.
func NewHighlightHandler(reads *ReadService) HighlightHandler { return HighlightHandler{reads: reads} }

// ServeHTTP answers the Kudos Quốc Dân top 5 as {items (≤5), nextCursor: null}.
// An empty parameter means "all"; a filter matching nothing answers no items.
func (h HighlightHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	hashtagID, okTag := optionalUUID(r.URL.Query().Get("hashtagId"))
	unitID, okUnit := optionalUUID(r.URL.Query().Get("unitId"))
	if !okTag || !okUnit {
		httpx.WriteError(w, http.StatusBadRequest, CodeInvalidFilter, "The filter is not valid.")
		return
	}
	page, err := h.reads.Highlight(r.Context(), viewer, HighlightFilter{HashtagID: hashtagID, UnitID: unitID})
	if err != nil {
		httpx.LogRequestFailure(r, err, "list highlight kudos")
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, page)
}

// optionalUUID parses raw; empty is nil and valid, garbage is invalid.
func optionalUUID(raw string) (*uuid.UUID, bool) {
	if raw == "" {
		return nil, true
	}
	id, err := uuid.Parse(raw)
	if err != nil {
		return nil, false
	}
	return &id, true
}
