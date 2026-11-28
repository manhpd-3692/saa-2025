package upload

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// PostCommitCleanupTimeout bounds one detached post-commit cleanup run (up to
// five Storage deletes plus their rows).
const PostCommitCleanupTimeout = 10 * time.Second

// TxPool queries and begins transactions (*pgxpool.Pool).
type TxPool interface {
	db.DBTX
	dbx.TxBeginner
}

// RemovedUpload is a committed attachment an edit dropped; the edit
// transaction marked it pending_delete (Codex N02).
type RemovedUpload struct {
	ID         uuid.UUID
	ObjectPath string
}

// PendingDeleteCleaner deletes the uploads an edit marked pending_delete, after
// that edit committed (Codex R04, N02). Best-effort: it never fails the edit.
type PendingDeleteCleaner interface {
	Cleanup(ctx context.Context, removed []RemovedUpload)
}

// PendingDeleteRowDeleter deletes a pending_delete row (*db.Queries).
type PendingDeleteRowDeleter interface {
	DeletePendingDeleteUpload(ctx context.Context, id uuid.UUID) (int64, error)
}

// StorageCleaner deletes synchronously: object first, then the row, and only a
// row still in pending_delete. A failure is logged and leaves the row for the
// manual purge.
type StorageCleaner struct {
	rows  PendingDeleteRowDeleter
	store ObjectStore
}

// NewStorageCleaner wires the queries and the Storage client.
func NewStorageCleaner(rows PendingDeleteRowDeleter, store ObjectStore) StorageCleaner {
	return StorageCleaner{rows: rows, store: store}
}

var (
	_ PendingDeleteCleaner = StorageCleaner{}
	_ PendingDeleteCleaner = AsyncCleaner{}
)

// Cleanup removes every upload in removed, logging each failure.
func (c StorageCleaner) Cleanup(ctx context.Context, removed []RemovedUpload) {
	for _, u := range removed {
		if err := deletePendingDeleteUpload(ctx, c.rows, c.store, u); err != nil {
			slog.WarnContext(ctx, "delete removed kudo image; left pending_delete for the purge", "upload_id", u.ID, "error", err)
		}
	}
}

// deletePendingDeleteUpload removes one upload already marked pending_delete by
// a committed transaction: the object first, then the row (only while it is
// still pending_delete). No row lock is held during Storage I/O, and any
// failure leaves the row pending_delete for the manual purge, so an object is
// never left without a row (Codex R04, N02; reviewer N1). Used by the edit
// cleanup, DELETE /uploads/{id} and the purge.
func deletePendingDeleteUpload(ctx context.Context, rows PendingDeleteRowDeleter, store ObjectStore, u RemovedUpload) error {
	if err := store.DeleteObject(ctx, u.ObjectPath); err != nil && !errors.Is(err, ErrObjectNotFound) {
		return fmt.Errorf("delete object %s: %w", u.ObjectPath, err)
	}
	if _, err := rows.DeletePendingDeleteUpload(ctx, u.ID); err != nil {
		return fmt.Errorf("delete upload row %s: %w", u.ID, err)
	}
	return nil
}

// AsyncCleaner is the production cleaner (reviewer W1, Codex R23): it runs the
// inner cleaner in its own goroutine under a context detached from the request
// and bounded by PostCommitCleanupTimeout, so a slow Storage never delays the
// edit's answer. Whatever it cannot delete stays for the manual purge.
type AsyncCleaner struct {
	inner   PendingDeleteCleaner
	timeout time.Duration
}

// NewAsyncCleaner wraps a synchronous cleaner.
func NewAsyncCleaner(inner PendingDeleteCleaner) AsyncCleaner {
	return AsyncCleaner{inner: inner, timeout: PostCommitCleanupTimeout}
}

// Cleanup returns at once; the deletes run in the background.
func (c AsyncCleaner) Cleanup(ctx context.Context, removed []RemovedUpload) {
	if len(removed) == 0 {
		return
	}
	detached := context.WithoutCancel(ctx)
	go func() {
		cleanCtx, cancel := context.WithTimeout(detached, c.timeout)
		defer cancel()
		defer func() {
			if rec := recover(); rec != nil {
				slog.ErrorContext(cleanCtx, "post-commit kudo image cleanup panicked", "panic", rec)
			}
		}()
		c.inner.Cleanup(cleanCtx, removed)
	}()
}
