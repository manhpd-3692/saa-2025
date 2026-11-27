package upload

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes of the upload endpoints.
const (
	CodeInvalidRequest     = "invalid_request"
	CodeInvalidAttachment  = "invalid_attachment"
	CodeStorageUnavailable = "storage_unavailable"
	CodeUploadQuota        = "upload_quota_exceeded"
)

const maxUploadRequestBytes = 4 << 10

// PendingUploadQuota caps the pending uploads one Sunner created in the last
// 24 h (reviewer W2): a kudo takes at most 5 images, so 20 leaves room for
// retries while bounding signed URLs and abandoned objects per account.
const PendingUploadQuota = 20

// PendingUploadWriter checks the owner's quota and writes the pending upload
// row (*db.Queries).
type PendingUploadWriter interface {
	CountRecentPendingUploadsByOwner(ctx context.Context, ownerID uuid.UUID) (int32, error)
	InsertKudoUpload(ctx context.Context, arg db.InsertKudoUploadParams) error
}

// UploadHandler serves POST /api/v1/uploads/kudo-images (F005 A4).
type UploadHandler struct {
	queries PendingUploadWriter
	store   ObjectStore
}

// NewUploadHandler wires the queries and the Storage client.
func NewUploadHandler(queries PendingUploadWriter, store ObjectStore) UploadHandler {
	return UploadHandler{queries: queries, store: store}
}

type createUploadRequest struct {
	ContentType string `json:"contentType"`
	Size        int64  `json:"size"`
}

type createUploadResponse struct {
	UploadID  uuid.UUID `json:"uploadId"`
	UploadURL string    `json:"uploadUrl"`
	Token     string    `json:"token"`
}

// ServeHTTP refuses a declared type or size outside the rules for fast
// feedback only (the stored object is checked at create), signs a write-once
// upload URL for an opaque key `kudo-images/{uploadId}.{ext}` with no user id in
// it (R01, R03), then records the caller's pending upload (N02). Over
// PendingUploadQuota it answers 429 before touching Storage (W2); concurrent
// requests can overshoot the cap by their number, which bounds abuse enough.
func (h UploadHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "upload handler used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	var req createUploadRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxUploadRequestBytes)).Decode(&req); err != nil {
		httpx.WriteError(w, http.StatusBadRequest, CodeInvalidRequest, "Body must be {contentType, size}.")
		return
	}
	ext := extensionFor(req.ContentType)
	if ext == "" || req.Size <= 0 || req.Size > MaxImageBytes {
		httpx.WriteError(w, http.StatusUnprocessableEntity, CodeInvalidAttachment,
			"Images must be JPEG, PNG or WebP and at most 5 MB.")
		return
	}

	countCtx, cancelCount := dbx.RequestContext(r.Context())
	pending, err := h.queries.CountRecentPendingUploadsByOwner(countCtx, viewer.UserID)
	cancelCount()
	switch {
	case err != nil:
		slog.ErrorContext(r.Context(), "count pending kudo uploads", "error", err)
		httpx.WriteInternalError(w)
		return
	case pending >= PendingUploadQuota:
		slog.WarnContext(r.Context(), "kudo upload quota reached", "user_id", viewer.UserID, "pending", pending)
		httpx.WriteError(w, http.StatusTooManyRequests, CodeUploadQuota,
			"Too many images are waiting to be used. Send or discard a kudo first, or try again tomorrow.")
		return
	}

	uploadID := uuid.New()
	objectPath := ObjectPath(uploadID.String() + "." + ext)
	// Sign first: when the row insert fails the URL is never handed out, so no
	// object can appear without its ownership row.
	signed, err := h.store.CreateSignedUploadURL(r.Context(), objectPath)
	if err != nil {
		writeStorageError(w, r, "sign kudo image upload", err)
		return
	}
	ctx, cancel := dbx.RequestContext(r.Context())
	defer cancel()
	if err := h.queries.InsertKudoUpload(ctx, db.InsertKudoUploadParams{
		ID: uploadID, OwnerID: viewer.UserID, ObjectPath: objectPath, Mime: req.ContentType, SizeBytes: req.Size,
	}); err != nil {
		slog.ErrorContext(r.Context(), "insert kudo upload", "error", err)
		httpx.WriteInternalError(w)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, createUploadResponse{UploadID: uploadID, UploadURL: signed.URL, Token: signed.Token})
}

// writeStorageError answers 503 when Storage is not configured, else 500.
func writeStorageError(w http.ResponseWriter, r *http.Request, action string, err error) {
	slog.ErrorContext(r.Context(), action, "error", err)
	if errors.Is(err, ErrStorageUnavailable) {
		httpx.WriteError(w, http.StatusServiceUnavailable, CodeStorageUnavailable, "Image storage is not available.")
		return
	}
	httpx.WriteInternalError(w)
}
