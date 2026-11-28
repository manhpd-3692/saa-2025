package upload

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// OrphanUploadAge is ORPHAN_UPLOAD_AGE_HOURS: the manual purge removes pending
// uploads older than this (F005 § 4.6).
const OrphanUploadAge = 24 * time.Hour

// PurgeResult counts what one purge run did.
type PurgeResult struct {
	Candidates int // rows listed as purgeable (all a dry run reports)
	Purged     int // row and object removed
	Skipped    int // attached meanwhile, or locked by a live request
	Failed     int // Storage or database error; the row stays for the next run
}

// PurgeStaleUploads is the manual/admin purge (Codex R04, N02; no scheduler):
// pending uploads created before now-OrphanUploadAge and every leftover
// pending_delete upload lose their object, then their row. Each row is claimed
// in its own short transaction under its row lock — a pending one is marked
// pending_delete (an attach that wins the race keeps its upload; attached
// uploads are never touched) — and the object and row are deleted after that
// commit, so no lock is held during Storage I/O. A failure leaves the row
// pending_delete for the next run (reviewer N1). A dry run only counts.
func PurgeStaleUploads(ctx context.Context, pool TxPool, store ObjectStore, now time.Time, dryRun bool) (PurgeResult, error) {
	cutoff := now.Add(-OrphanUploadAge)
	listCtx, cancel := dbx.RequestContext(ctx)
	ids, err := db.New(pool).ListPurgeableUploads(listCtx, cutoff)
	cancel()
	if err != nil {
		return PurgeResult{}, fmt.Errorf("list purgeable uploads: %w", err)
	}
	result := PurgeResult{Candidates: len(ids)}
	if dryRun {
		return result, nil
	}
	for _, id := range ids {
		purged, err := purgeOne(ctx, pool, store, id, cutoff)
		switch {
		case err != nil:
			result.Failed++
			slog.WarnContext(ctx, "purge kudo upload", "upload_id", id, "error", err)
		case purged:
			result.Purged++
		default:
			result.Skipped++
		}
	}
	return result, nil
}

func purgeOne(ctx context.Context, pool TxPool, store ObjectStore, id uuid.UUID, cutoff time.Time) (bool, error) {
	var claimed *RemovedUpload
	err := dbx.WithTx(ctx, pool, func(ctx context.Context, tx pgx.Tx) error {
		q := db.New(tx)
		row, err := q.LockPurgeableUpload(ctx, db.LockPurgeableUploadParams{ID: id, CreatedBefore: cutoff})
		if errors.Is(err, pgx.ErrNoRows) {
			return nil // attached meanwhile, or a live request holds it
		}
		if err != nil {
			return fmt.Errorf("lock upload: %w", err)
		}
		if row.State == db.KudoUploadStatePending {
			if _, err := q.MarkUnsavedUploadPendingDelete(ctx, id); err != nil {
				return fmt.Errorf("mark upload pending_delete: %w", err)
			}
		}
		claimed = &RemovedUpload{ID: row.ID, ObjectPath: row.ObjectPath}
		return nil
	})
	if err != nil || claimed == nil {
		return false, err
	}
	deleteCtx, cancel := context.WithTimeout(ctx, storageRequestTimeout)
	defer cancel()
	if err := deletePendingDeleteUpload(deleteCtx, db.New(pool), store, *claimed); err != nil {
		return false, err
	}
	return true, nil
}
