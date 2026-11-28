package upload

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// EditAttachment is one entry of an edit's complete, ordered image list.
type EditAttachment struct {
	ID   uuid.UUID
	Kept bool // already attached to the kudo being edited
	Mime string
	Size int64
}

// InspectEdit runs before the edit transaction (F005 A7, Codex R03, N02): 0–5
// distinct ids, each either the caller's pending upload (new: the stored object
// gets the same real-object checks as on create) or the caller's upload
// attached to this kudo (kept). Kept uploads are re-checked under the kudo row
// lock by FinalizeEdit, which is what makes a stale prefill fail.
func (f *AttachmentFinalizer) InspectEdit(ctx context.Context, q UploadLister, ownerID, kudoID uuid.UUID,
	uploadIDs []uuid.UUID) ([]EditAttachment, error) {
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
	list := make([]EditAttachment, 0, len(uploadIDs))
	for _, id := range uploadIDs {
		row, ok := byID[id]
		switch {
		case !ok || row.OwnerID != ownerID:
			return nil, ErrInvalidAttachment
		case row.State == db.KudoUploadStateAttached && row.KudoID != nil && *row.KudoID == kudoID:
			list = append(list, EditAttachment{ID: id, Kept: true})
		case row.State == db.KudoUploadStatePending && row.KudoID == nil:
			checked, err := f.inspectObject(ctx, row)
			if err != nil {
				return nil, err
			}
			list = append(list, EditAttachment{ID: id, Mime: checked.Mime, Size: checked.Size})
		default: // attached elsewhere, or pending_delete: never eligible again (N02)
			return nil, ErrInvalidAttachment
		}
	}
	return list, nil
}

// FinalizeEdit runs inside the edit transaction while it holds the kudo row
// lock (BR-007, Codex N02). A kept upload must still be attached to the kudo
// AND referenced by one of its current kudo_images rows; a new one must still
// be the caller's pending upload and is attached. Current attachments missing
// from the list become pending_delete and lose their kudo_images row; the
// list is then written as the new order. Returns the removed uploads, whose
// objects and rows are deleted only after commit (PendingDeleteCleaner).
func (f *AttachmentFinalizer) FinalizeEdit(ctx context.Context, q *db.Queries, ownerID, kudoID uuid.UUID,
	list []EditAttachment) ([]RemovedUpload, error) {
	current, err := q.ListKudoEditImages(ctx, kudoID)
	if err != nil {
		return nil, fmt.Errorf("list current images: %w", err)
	}
	referenced := make(map[uuid.UUID]bool, len(current))
	for _, img := range current {
		referenced[img.UploadID] = true
	}
	if err := f.lockAndCheck(ctx, q, ownerID, kudoID, list, referenced); err != nil {
		return nil, err
	}
	kept := make(map[uuid.UUID]bool, len(list))
	for _, a := range list {
		if a.Kept {
			kept[a.ID] = true
			continue
		}
		attached, err := q.AttachKudoUpload(ctx, db.AttachKudoUploadParams{
			ID: a.ID, OwnerID: ownerID, KudoID: &kudoID, Mime: a.Mime, SizeBytes: a.Size,
		})
		if err != nil {
			return nil, fmt.Errorf("attach upload %s: %w", a.ID, err)
		}
		if attached != 1 {
			return nil, ErrInvalidAttachment
		}
	}
	removed, err := markRemoved(ctx, q, kudoID, current, kept)
	if err != nil {
		return nil, err
	}
	if err := q.DeleteKudoImages(ctx, kudoID); err != nil {
		return nil, fmt.Errorf("delete kudo images: %w", err)
	}
	for i, a := range list {
		if err := q.InsertKudoImage(ctx, db.InsertKudoImageParams{KudoID: kudoID, UploadID: a.ID, Position: int16(i)}); err != nil {
			return nil, fmt.Errorf("insert kudo image: %w", err)
		}
	}
	return removed, nil
}

// lockAndCheck locks the listed uploads (id order, as create does) and
// re-checks the new/kept classification InspectEdit made before the lock.
func (f *AttachmentFinalizer) lockAndCheck(ctx context.Context, q *db.Queries, ownerID, kudoID uuid.UUID,
	list []EditAttachment, referenced map[uuid.UUID]bool) error {
	if len(list) == 0 {
		return nil
	}
	ids := make([]uuid.UUID, len(list))
	for i, a := range list {
		ids[i] = a.ID
	}
	locked, err := q.LockKudoUploadsForUpdate(ctx, ids)
	if err != nil {
		return fmt.Errorf("lock uploads: %w", err)
	}
	if len(locked) != len(ids) {
		return ErrInvalidAttachment
	}
	byID := make(map[uuid.UUID]db.LockKudoUploadsForUpdateRow, len(locked))
	for _, row := range locked {
		byID[row.ID] = row
	}
	for _, a := range list {
		row := byID[a.ID]
		ok := row.OwnerID == ownerID
		if a.Kept {
			ok = ok && row.State == db.KudoUploadStateAttached && row.KudoID != nil && *row.KudoID == kudoID && referenced[a.ID]
		} else {
			ok = ok && row.State == db.KudoUploadStatePending && row.KudoID == nil
		}
		if !ok {
			return ErrInvalidAttachment
		}
	}
	return nil
}

// markRemoved sets pending_delete on every current attachment the edit dropped.
func markRemoved(ctx context.Context, q *db.Queries, kudoID uuid.UUID, current []db.ListKudoEditImagesRow,
	kept map[uuid.UUID]bool) ([]RemovedUpload, error) {
	var ids []uuid.UUID
	for _, img := range current {
		if !kept[img.UploadID] {
			ids = append(ids, img.UploadID)
		}
	}
	if len(ids) == 0 {
		return nil, nil
	}
	rows, err := q.MarkKudoUploadsPendingDelete(ctx, db.MarkKudoUploadsPendingDeleteParams{Ids: ids, KudoID: &kudoID})
	if err != nil {
		return nil, fmt.Errorf("mark removed uploads: %w", err)
	}
	if len(rows) != len(ids) {
		return nil, fmt.Errorf("mark removed uploads: %d of %d rows changed", len(rows), len(ids))
	}
	removed := make([]RemovedUpload, len(rows))
	for i, row := range rows {
		removed[i] = RemovedUpload{ID: row.ID, ObjectPath: row.ObjectPath}
	}
	return removed, nil
}
