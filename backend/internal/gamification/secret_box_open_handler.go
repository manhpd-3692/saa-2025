package gamification

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes of POST /api/v1/me/secret-boxes/open (F008 DEC-004, C04).
const (
	CodeInvalidIdempotencyKey = "invalid_idempotency_key"
	CodeNoUnopenedBox         = "no_unopened_box"
	CodeIdempotencyKeyInUse   = "idempotency_key_in_use"
)

// IdempotencyKeyHeader carries one UUID per opening intent (Codex R12).
const IdempotencyKeyHeader = "Idempotency-Key"

// SecretBoxOpenHandler serves POST /api/v1/me/secret-boxes/open.
type SecretBoxOpenHandler struct {
	service *SecretBoxService
}

// NewSecretBoxOpenHandler wires the service.
func NewSecretBoxOpenHandler(service *SecretBoxService) SecretBoxOpenHandler {
	return SecretBoxOpenHandler{service: service}
}

// ServeHTTP opens one of the caller's boxes; the box is chosen by the server,
// never by the client (BR-007).
func (h SecretBoxOpenHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "secret box handler used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	requestID, err := uuid.Parse(strings.TrimSpace(r.Header.Get(IdempotencyKeyHeader)))
	if err != nil || requestID == uuid.Nil {
		httpx.WriteError(w, http.StatusBadRequest, CodeInvalidIdempotencyKey,
			"An Idempotency-Key header with a UUID is required.")
		return
	}
	result, err := h.service.Open(r.Context(), viewer.UserID, requestID)
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, result)
	case errors.Is(err, ErrNoUnopenedBox):
		httpx.WriteError(w, http.StatusConflict, CodeNoUnopenedBox, "You have no unopened secret box.")
	case errors.Is(err, ErrIdempotencyKeyInUse):
		httpx.WriteError(w, http.StatusConflict, CodeIdempotencyKeyInUse, "Use a new Idempotency-Key for this opening.")
	default:
		// A caller who hung up is INFO: the open committed or rolled back whole; a retry replays (R12).
		httpx.LogRequestFailure(r, err, "open secret box", "user_id", viewer.UserID)
		httpx.WriteInternalError(w)
	}
}
