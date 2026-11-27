package upload

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// ErrInvalidAttachment is every attachment refusal (F005 BR-003, BR-007): the
// API answers 422 `invalid_attachment` and commits nothing.
var ErrInvalidAttachment = errors.New("invalid attachment")

// MaxImagesPerKudo is IMAGES_MAX (BR-003).
const MaxImagesPerKudo = 5

// InspectedUpload is an upload whose stored object passed the real-object checks.
type InspectedUpload struct {
	ID   uuid.UUID
	Mime string
	Size int64
}

// UploadLister reads upload rows outside the transaction (*db.Queries).
type UploadLister interface {
	ListKudoUploadsByIDs(ctx context.Context, ids []uuid.UUID) ([]db.ListKudoUploadsByIDsRow, error)
}

// AttachmentFinalizer checks attachments against the real stored objects
// (Codex R03) and moves them pending -> attached inside the kudo transaction (N02).
type AttachmentFinalizer struct {
	store ObjectStore
}

// NewAttachmentFinalizer wires the Storage client.
func NewAttachmentFinalizer(store ObjectStore) *AttachmentFinalizer {
	return &AttachmentFinalizer{store: store}
}

// Inspect runs before the transaction: 0–5 distinct uploads, each the caller's
// own pending upload, each stored object a real JPEG/PNG/WebP of at most 5 MB
// (metadata plus a 512-byte magic sniff). Keys are write-once, so a checked
// object cannot change afterwards; ownership and state are re-checked under row
// locks by Attach.
func (f *AttachmentFinalizer) Inspect(ctx context.Context, q UploadLister, ownerID uuid.UUID, uploadIDs []uuid.UUID) ([]InspectedUpload, error) {
	if len(uploadIDs) > MaxImagesPerKudo || hasDuplicates(uploadIDs) {
		return nil, ErrInvalidAttachment
	}
	if len(uploadIDs) == 0 {
		return nil, nil
	}
	rows, err := q.ListKudoUploadsByIDs(ctx, uploadIDs)
	if err != nil {
		return nil, fmt.Errorf("list uploads: %w", err)
	}
	byID := make(map[uuid.UUID]db.ListKudoUploadsByIDsRow, len(rows))
	for _, row := range rows {
		byID[row.ID] = row
	}
	inspected := make([]InspectedUpload, 0, len(uploadIDs))
	for _, id := range uploadIDs {
		row, ok := byID[id]
		if !ok || row.OwnerID != ownerID || row.State != db.KudoUploadStatePending || row.KudoID != nil {
			return nil, ErrInvalidAttachment
		}
		checked, err := f.inspectObject(ctx, row)
		if err != nil {
			return nil, err
		}
		inspected = append(inspected, checked)
	}
	return inspected, nil
}

func (f *AttachmentFinalizer) inspectObject(ctx context.Context, row db.ListKudoUploadsByIDsRow) (InspectedUpload, error) {
	info, err := f.store.ObjectInfo(ctx, row.ObjectPath)
	switch {
	case errors.Is(err, ErrObjectNotFound):
		return InspectedUpload{}, ErrInvalidAttachment // never uploaded
	case err != nil:
		return InspectedUpload{}, fmt.Errorf("inspect upload %s: %w", row.ID, err)
	case info.Size <= 0 || info.Size > MaxImageBytes || extensionFor(info.ContentType) == "":
		return InspectedUpload{}, ErrInvalidAttachment
	}
	head, err := f.store.ReadPrefix(ctx, row.ObjectPath, SniffBytes)
	switch {
	case errors.Is(err, ErrObjectNotFound):
		return InspectedUpload{}, ErrInvalidAttachment
	case err != nil:
		return InspectedUpload{}, fmt.Errorf("sniff upload %s: %w", row.ID, err)
	}
	if sniffImageType(head) != info.ContentType {
		return InspectedUpload{}, ErrInvalidAttachment // lying content type or not an image
	}
	return InspectedUpload{ID: row.ID, Mime: info.ContentType, Size: info.Size}, nil
}

// Attach locks the uploads (id order), re-checks they are still the caller's
// unattached pending uploads and attaches them to the kudo, set once (BR-007).
func (f *AttachmentFinalizer) Attach(ctx context.Context, q *db.Queries, ownerID, kudoID uuid.UUID, uploads []InspectedUpload) error {
	if len(uploads) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, len(uploads))
	for i, u := range uploads {
		ids[i] = u.ID
	}
	locked, err := q.LockKudoUploadsForUpdate(ctx, ids)
	if err != nil {
		return fmt.Errorf("lock uploads: %w", err)
	}
	if len(locked) != len(ids) {
		return ErrInvalidAttachment
	}
	for _, row := range locked {
		if row.OwnerID != ownerID || row.State != db.KudoUploadStatePending || row.KudoID != nil {
			return ErrInvalidAttachment
		}
	}
	for _, u := range uploads {
		attached, err := q.AttachKudoUpload(ctx, db.AttachKudoUploadParams{
			ID: u.ID, OwnerID: ownerID, KudoID: &kudoID, Mime: u.Mime, SizeBytes: u.Size,
		})
		if err != nil {
			return fmt.Errorf("attach upload %s: %w", u.ID, err)
		}
		if attached != 1 {
			return ErrInvalidAttachment
		}
	}
	return nil
}

func hasDuplicates(ids []uuid.UUID) bool {
	seen := make(map[uuid.UUID]struct{}, len(ids))
	for _, id := range ids {
		if _, dup := seen[id]; dup {
			return true
		}
		seen[id] = struct{}{}
	}
	return false
}
