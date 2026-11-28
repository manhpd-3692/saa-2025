package kudo

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// Error codes of the edit endpoints (F005 A6, A7; BR-006).
const (
	CodeNotKudoAuthor  = "not_kudo_author"
	CodeKudoSpamLocked = "kudo_spam_locked"
)

// EditHandler serves GET /api/v1/kudos/{id}/edit (F005 A6).
type EditHandler struct {
	service *UpdateService
}

// NewEditHandler wires the update service.
func NewEditHandler(service *UpdateService) EditHandler { return EditHandler{service: service} }

// ServeHTTP answers the prefill, 403 for a non-author, 409 while the kudo is
// marked spam, 404 for a missing (or, to others, hidden) kudo.
func (h EditHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
		return
	}
	form, err := h.service.GetForEdit(r.Context(), viewer.ID, id)
	if err != nil {
		writeKudoWriteError(w, r, "read kudo for edit", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, form)
}

// UpdateHandler serves PATCH /api/v1/kudos/{id} (F005 A7).
type UpdateHandler struct {
	service *UpdateService
}

// NewUpdateHandler wires the update service.
func NewUpdateHandler(service *UpdateService) UpdateHandler { return UpdateHandler{service: service} }

// ServeHTTP saves the author's changes; the editor is always the verified
// caller and a receiverId in the body is never read (UpdateInput has none).
func (h UpdateHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := viewerFrom(r)
	if !ok {
		httpx.WriteInternalError(w)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
		return
	}
	var in UpdateInput
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxCreateBodyBytes)).Decode(&in); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, CodeInvalidRequest, "Body must be a kudo JSON object.")
		return
	}
	if err := h.service.Update(r.Context(), viewer.ID, id, in); err != nil {
		writeKudoWriteError(w, r, "update kudo", err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, createResponse{KudoID: id})
}

// writeKudoWriteError maps every create/edit refusal to its answer (DEC-001,
// BR-006); anything else is logged and answers 500.
func writeKudoWriteError(w http.ResponseWriter, r *http.Request, action string, err error) {
	var invalid *ValidationError
	switch {
	case errors.As(err, &invalid):
		httpx.WriteJSON(w, http.StatusUnprocessableEntity, validationEnvelope{Error: validationDetail{
			Code: CodeValidationFailed, Message: "Some fields are missing or invalid.", Fields: invalid.Fields,
		}})
	case errors.Is(err, upload.ErrInvalidAttachment):
		httpx.WriteError(w, http.StatusUnprocessableEntity, CodeInvalidAttachment,
			"An image is missing, not yours, already used, or not a JPEG, PNG or WebP of at most 5 MB.")
	case errors.Is(err, ErrKudoNotFound):
		httpx.WriteError(w, http.StatusNotFound, CodeKudoNotFound, "Kudo not found.")
	case errors.Is(err, ErrNotKudoAuthor):
		httpx.WriteError(w, http.StatusForbidden, CodeNotKudoAuthor, "You can only edit your own kudos.")
	case errors.Is(err, ErrKudoSpam):
		httpx.WriteError(w, http.StatusConflict, CodeKudoSpamLocked, "This kudo cannot be edited right now.")
	case errors.Is(err, upload.ErrStorageUnavailable):
		slog.ErrorContext(r.Context(), action+": storage unavailable", "error", err)
		httpx.WriteError(w, http.StatusServiceUnavailable, upload.CodeStorageUnavailable, "Image storage is not available.")
	default:
		httpx.LogRequestFailure(r, err, action, "path", r.URL.Path)
		httpx.WriteInternalError(w)
	}
}
