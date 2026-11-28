package upload

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes of DELETE /api/v1/uploads/{uploadId}.
const (
	CodeUploadNotFound = "upload_not_found"
	CodeUploadAttached = "upload_attached"
)

// Refusals of a pending-upload delete (BR-007).
var (
	errUploadNotFound = errors.New("upload not found")
	errUploadAttached = errors.New("upload is attached or pending deletion")
)

// UploadDeleteHandler serves DELETE /api/v1/uploads/{uploadId} (F005 A8): the
// caller removes one of their own unsaved uploads (Codex R04).
type UploadDeleteHandler struct {
	pool  TxPool
	store ObjectStore
}

// NewUploadDeleteHandler wires the pool and the Storage client.
func NewUploadDeleteHandler(pool TxPool, store ObjectStore) UploadDeleteHandler {
	return UploadDeleteHandler{pool: pool, store: store}
}

// ServeHTTP answers 204 once the object and the row are gone; 404 for a
// missing, malformed or foreign id (foreign uploads are not revealed); 409 when
// the upload is attached or already pending_delete (N02). Under its row lock the
// upload is only marked pending_delete; the object and then the row are deleted
// after commit, so no lock is held during Storage I/O (reviewer W2). When that
// fails the row stays pending_delete for the manual purge (reviewer N1) and the
// answer is 5xx, which the UI ignores.
func (h UploadDeleteHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "upload delete handler used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	id, err := uuid.Parse(r.PathValue("uploadId"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, CodeUploadNotFound, "Upload not found.")
		return
	}
	var claimed RemovedUpload
	err = dbx.WithTx(r.Context(), h.pool, func(ctx context.Context, tx pgx.Tx) error {
		var txErr error
		claimed, txErr = claimPendingUpload(ctx, db.New(tx), viewer.UserID, id)
		return txErr
	})
	switch {
	case errors.Is(err, errUploadNotFound):
		httpx.WriteError(w, http.StatusNotFound, CodeUploadNotFound, "Upload not found.")
		return
	case errors.Is(err, errUploadAttached):
		httpx.WriteError(w, http.StatusConflict, CodeUploadAttached, "This image is already part of a kudo.")
		return
	case err != nil:
		httpx.LogRequestFailure(r, err, "delete kudo upload")
		httpx.WriteInternalError(w)
		return
	}
	deleteCtx, cancel := context.WithTimeout(context.WithoutCancel(r.Context()), storageRequestTimeout)
	defer cancel()
	if err := deletePendingDeleteUpload(deleteCtx, db.New(h.pool), h.store, claimed); err != nil {
		writeStorageError(w, r, "delete kudo upload; left pending_delete for the purge", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// claimPendingUpload locks the row and marks it pending_delete when it is the
// caller's pending upload. A create attaching the same upload either commits
// first (then this answers 409) or finds it pending_delete (422
// invalid_attachment); a second DELETE also sees pending_delete (409).
func claimPendingUpload(ctx context.Context, q *db.Queries, ownerID, id uuid.UUID) (RemovedUpload, error) {
	row, err := q.LockKudoUploadForDelete(ctx, id)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return RemovedUpload{}, errUploadNotFound
	case err != nil:
		return RemovedUpload{}, fmt.Errorf("lock upload: %w", err)
	case row.OwnerID != ownerID:
		return RemovedUpload{}, errUploadNotFound
	case row.State != db.KudoUploadStatePending:
		return RemovedUpload{}, errUploadAttached
	}
	if _, err := q.MarkUnsavedUploadPendingDelete(ctx, id); err != nil {
		return RemovedUpload{}, fmt.Errorf("mark upload pending_delete: %w", err)
	}
	return RemovedUpload{ID: row.ID, ObjectPath: row.ObjectPath}, nil
}
