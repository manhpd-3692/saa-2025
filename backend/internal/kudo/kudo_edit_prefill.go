package kudo

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// EditForm is the A6 prefill payload. Images carry the opaque uploadId the
// author sends back to keep them, plus a Go-signed read URL (null when it
// cannot be signed).
type EditForm struct {
	ID          uuid.UUID    `json:"id"`
	Receiver    EditReceiver `json:"receiver"`
	Title       string       `json:"title"`
	ContentHTML string       `json:"contentHtml"`
	Hashtags    []string     `json:"hashtags"`
	Images      []EditImage  `json:"images"`
	IsAnonymous bool         `json:"isAnonymous"`
}

// EditReceiver is the locked recipient shown read-only (D004).
type EditReceiver struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	UnitCode  *string   `json:"unitCode"`
}

// EditImage is one committed attachment of the kudo being edited.
type EditImage struct {
	UploadID uuid.UUID `json:"uploadId"`
	URL      *string   `json:"url"`
}

// GetForEdit is A6 (FR-102, BR-006): the author's kudo with hashtags and
// current attachments (kudo_images rows on attached uploads, N02). A snapshot
// only; Update re-checks every kept upload under the kudo lock, so a stale
// prefill cannot bring a removed image back.
func (s *UpdateService) GetForEdit(ctx context.Context, viewerID, id uuid.UUID) (EditForm, error) {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	row, err := s.editableKudo(dbCtx, viewerID, id)
	if err != nil {
		return EditForm{}, err
	}
	hashtags, err := s.queries.ListKudoHashtagNames(dbCtx, id)
	if err != nil {
		return EditForm{}, fmt.Errorf("read kudo hashtags: %w", err)
	}
	images, err := s.queries.ListKudoEditImages(dbCtx, id)
	if err != nil {
		return EditForm{}, fmt.Errorf("read kudo images: %w", err)
	}
	return EditForm{
		ID:          row.ID,
		Receiver:    EditReceiver{ID: row.ReceiverID, Name: row.ReceiverName, AvatarURL: row.ReceiverAvatarUrl, UnitCode: row.ReceiverUnitCode},
		Title:       row.Title,
		ContentHTML: row.Content,
		Hashtags:    nonNil(hashtags),
		Images:      s.signEditImages(ctx, id, images),
		IsAnonymous: row.IsAnonymous,
	}, nil
}

// signEditImages signs every opaque key in one batch; a key that cannot be
// signed (or a Storage failure) yields a null URL instead of failing the form.
func (s *UpdateService) signEditImages(ctx context.Context, kudoID uuid.UUID, rows []db.ListKudoEditImagesRow) []EditImage {
	images := make([]EditImage, len(rows))
	if len(rows) == 0 {
		return images
	}
	paths := make([]string, len(rows))
	for i, row := range rows {
		paths[i] = row.ObjectPath
	}
	signed, err := s.store.SignReadURLs(ctx, paths, SignedURLTTL)
	if err != nil {
		slog.WarnContext(ctx, "sign kudo edit image URLs", "kudo_id", kudoID, "error", err)
	}
	for i, row := range rows {
		images[i].UploadID = row.UploadID
		if u, ok := signed[row.ObjectPath]; ok {
			images[i].URL = &u
		}
	}
	return images
}
