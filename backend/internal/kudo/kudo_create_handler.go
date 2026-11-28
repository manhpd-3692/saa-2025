package kudo

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes of POST /api/v1/kudos (F005 DEC-001).
const (
	CodeInvalidRequest    = "invalid_request"
	CodeValidationFailed  = "validation_failed"
	CodeInvalidAttachment = "invalid_attachment"
)

// maxCreateBodyBytes bounds the request body; 1,000 visible characters of
// formatted HTML plus the other fields fit well inside it.
const maxCreateBodyBytes = 64 << 10

// CreateHandler serves POST /api/v1/kudos (F005 A5).
type CreateHandler struct {
	service *CreateService
}

// NewCreateHandler wires the create service.
func NewCreateHandler(service *CreateService) CreateHandler { return CreateHandler{service: service} }

type createResponse struct {
	KudoID uuid.UUID `json:"kudoId"`
}

// validationEnvelope is the error envelope plus the refused fields.
type validationEnvelope struct {
	Error validationDetail `json:"error"`
}

type validationDetail struct {
	Code    string       `json:"code"`
	Message string       `json:"message"`
	Fields  []FieldError `json:"fields"`
}

// ServeHTTP creates a kudo from the verified sender; a sender id in the body is
// never read (CreateInput has no such field).
func (h CreateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	var in CreateInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxCreateBodyBytes)).Decode(&in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, CodeInvalidRequest, "Body must be a kudo JSON object.")
		return
	}
	kudoID, err := h.service.Create(r.Context(), viewer.ID, in)
	if err != nil {
		writeKudoWriteError(w, r, "create kudo", err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, createResponse{KudoID: kudoID})
}
