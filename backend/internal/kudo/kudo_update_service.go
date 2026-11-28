package kudo

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// Edit refusals (BR-006, FR-602); nothing is written.
var (
	ErrNotKudoAuthor = errors.New("only the sender can edit this kudo")
	ErrKudoSpam      = errors.New("a kudo marked spam cannot be edited")
)

// UpdateService is KudoService.GetForEdit / Update (F005 A6, A7).
type UpdateService struct {
	pool      dbx.TxBeginner
	queries   *db.Queries
	finalizer *upload.AttachmentFinalizer
	cleaner   upload.PendingDeleteCleaner
	store     upload.ObjectStore
}

// NewUpdateService wires the pool, the queries, the attachment finalizer, the
// post-commit cleaner of removed images and the Storage client (read URLs).
func NewUpdateService(pool dbx.TxBeginner, queries *db.Queries, finalizer *upload.AttachmentFinalizer,
	cleaner upload.PendingDeleteCleaner, store upload.ObjectStore) *UpdateService {
	return &UpdateService{pool: pool, queries: queries, finalizer: finalizer, cleaner: cleaner, store: store}
}

// editRefusal is BR-006. A non-author asking about a kudo others cannot see
// (spam) gets the same not-found as the detail read, so ids cannot be probed.
func editRefusal(senderID uuid.UUID, status db.KudoStatus, viewerID uuid.UUID) error {
	switch {
	case senderID != viewerID && status != db.KudoStatusPublic:
		return ErrKudoNotFound
	case senderID != viewerID:
		return ErrNotKudoAuthor
	case status == db.KudoStatusSpam:
		return ErrKudoSpam
	}
	return nil
}

// editableKudo reads the kudo without a lock and applies BR-006: the prefill
// and the cheap pre-check of Update (re-checked under the lock in apply).
func (s *UpdateService) editableKudo(ctx context.Context, viewerID, id uuid.UUID) (db.GetKudoForEditRow, error) {
	row, err := s.queries.GetKudoForEdit(ctx, id)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return row, ErrKudoNotFound
	case err != nil:
		return row, fmt.Errorf("read kudo for edit: %w", err)
	}
	return row, editRefusal(row.SenderID, row.Status, viewerID)
}

// Update is A7. Non-authors and spam kudos are refused before validation or
// any Storage read; then sanitize -> visible text -> rules (R20), real-object
// checks for new uploads (R03), and one transaction holding the kudo row lock
// to commit (N05): author/spam re-check, content, hashtags, attachments
// (kept / new / removed -> pending_delete, N02) and, when the kudo ends up
// anonymous, the notification redaction (R02, N01). After commit the removed
// images are deleted, best-effort (R04). No notification is sent on edit.
func (s *UpdateService) Update(ctx context.Context, viewerID, id uuid.UUID, in UpdateInput) error {
	preCtx, cancel := dbx.RequestContext(ctx)
	_, err := s.editableKudo(preCtx, viewerID, id)
	cancel()
	if err != nil {
		return err
	}
	valid, err := validateUpdate(in)
	if err != nil {
		return err
	}
	checkCtx, cancel := context.WithTimeout(ctx, attachmentCheckTimeout)
	list, err := s.finalizer.InspectEdit(checkCtx, s.queries, viewerID, id, in.ImageUploadIDs)
	cancel()
	if err != nil {
		return err
	}

	var removed []upload.RemovedUpload
	err = dbx.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		var txErr error
		removed, txErr = s.apply(ctx, db.New(tx), viewerID, id, in.IsAnonymous, valid, list)
		return txErr
	})
	if err != nil {
		return err
	}
	if len(removed) > 0 {
		// Detached from the request, bounded either way (reviewer N2). Production wires
		// upload.AsyncCleaner, which re-detaches and runs in the background, so the
		// deletes never delay this answer (W1); the purge is the safety net.
		cleanCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), upload.PostCommitCleanupTimeout)
		s.cleaner.Cleanup(cleanCtx, removed)
		cancel()
	}
	return nil
}

func (s *UpdateService) apply(ctx context.Context, q *db.Queries, viewerID, id uuid.UUID, anonymous bool,
	valid validKudo, list []upload.EditAttachment) ([]upload.RemovedUpload, error) {
	locked, err := q.LockKudoForEdit(ctx, id)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return nil, ErrKudoNotFound
	case err != nil:
		return nil, fmt.Errorf("lock kudo: %w", err)
	}
	if err := editRefusal(locked.SenderID, locked.Status, viewerID); err != nil {
		return nil, err
	}
	if err := q.UpdateKudoContent(ctx, db.UpdateKudoContentParams{
		ID: id, Title: valid.title, Content: valid.content, IsAnonymous: anonymous,
	}); err != nil {
		return nil, fmt.Errorf("update kudo: %w", err)
	}
	if err := q.UnlinkKudoHashtags(ctx, id); err != nil {
		return nil, fmt.Errorf("unlink hashtags: %w", err)
	}
	if err := linkHashtags(ctx, q, id, valid.hashtags); err != nil {
		return nil, err
	}
	removed, err := s.finalizer.FinalizeEdit(ctx, q, viewerID, id, list)
	if err != nil {
		return nil, err
	}
	if anonymous {
		if err := redactNotificationSenders(ctx, q, id); err != nil {
			return nil, err
		}
	}
	return removed, nil
}
