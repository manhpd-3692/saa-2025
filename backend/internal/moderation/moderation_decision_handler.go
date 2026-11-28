package moderation

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes of the decision endpoints (Codex R13, N08).
const (
	CodeInvalidRequest = "invalid_request"
	CodeKudoNotFound   = "kudo_not_found"
	CodeStaleDecision  = "stale_decision"
)

const maxDecisionBodyBytes = 1 << 10

// DecisionHandler serves POST /api/v1/admin/kudos/{id}/spam and .../public.
// The target status is fixed by the route, never read from input (R13).
type DecisionHandler struct {
	service *Service
	target  db.KudoStatus
}

// NewSpamHandler marks a kudo Spam (A3).
func NewSpamHandler(service *Service) DecisionHandler {
	return DecisionHandler{service: service, target: db.KudoStatusSpam}
}

// NewPublicHandler marks a kudo Public (A4).
func NewPublicHandler(service *Service) DecisionHandler {
	return DecisionHandler{service: service, target: db.KudoStatusPublic}
}

type decisionRequest struct {
	ExpectedVersion *int32 `json:"expectedVersion"`
}

// staleEnvelope is the 409 body: the error plus the current row to refresh.
type staleEnvelope struct {
	Error   httpx.ErrorDetail `json:"error"`
	Current KudoModeration    `json:"current"`
}

// ServeHTTP runs behind the ADMIN chain (RequireAdmin on users.role, BR-007).
func (h DecisionHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	admin, ok := auth.FromContext(r.Context())
	if !ok || !admin.IsAdmin() {
		slog.ErrorContext(r.Context(), "moderation handler used outside the ADMIN chain")
		httpx.WriteError(w, http.StatusForbidden, httpx.CodeForbidden, "Admin role required.")
		return
	}
	kudoID, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
		return
	}
	var req decisionRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxDecisionBodyBytes)).Decode(&req); err != nil ||
		req.ExpectedVersion == nil || *req.ExpectedVersion < 0 {
		httpx.WriteError(w, http.StatusBadRequest, CodeInvalidRequest, "Body must be {expectedVersion} with a non-negative integer.")
		return
	}
	decision, err := h.service.SetStatus(r.Context(), admin.UserID, kudoID, h.target, *req.ExpectedVersion)
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, decision)
	case errors.Is(err, ErrKudoNotFound):
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
	case errors.Is(err, ErrStaleDecision):
		httpx.WriteJSON(w, http.StatusConflict, staleEnvelope{
			Error:   httpx.ErrorDetail{Code: CodeStaleDecision, Message: "Another admin changed this kudo; refresh it."},
			Current: decision.Kudo,
		})
	default:
		httpx.LogRequestFailure(r, err, "moderation decision", "kudo_id", kudoID)
		httpx.WriteInternalError(w)
	}
}
