package kudo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// attachmentCheckTimeout bounds the pre-transaction Storage checks of up to
// five uploads (metadata plus a 512-byte read each).
const attachmentCheckTimeout = 10 * time.Second

// CreateService is KudoService.Create (F005 A5).
type CreateService struct {
	pool      dbx.TxBeginner
	queries   upload.UploadLister
	finalizer *upload.AttachmentFinalizer
	notifier  notification.Notifier
}

// NewCreateService wires the pool, the pre-check queries, the attachment
// finalizer and the post-commit notifier.
func NewCreateService(pool dbx.TxBeginner, queries upload.UploadLister, finalizer *upload.AttachmentFinalizer,
	notifier notification.Notifier) *CreateService {
	return &CreateService{pool: pool, queries: queries, finalizer: finalizer, notifier: notifier}
}

// createdKudo is what the committed transaction hands to the notifier.
type createdKudo struct {
	id         uuid.UUID
	sender     *db.GetKudoSenderBriefRow // nil for an anonymous kudo
	transition *notification.HeroTransition
}

// Create validates on the stored representation (sanitize -> visible text ->
// rules, R20), checks attachments against the real objects (R03), then in one
// transaction locks the receiver (the only existing row it locks, N05), counts
// distinct senders before and after the insert (R10) and attaches the uploads
// (N02). After commit it notifies kudo_received and, when the tier rose,
// hero_level_up, under a detached 2 s context (R23).
func (s *CreateService) Create(ctx context.Context, senderID uuid.UUID, in CreateInput) (uuid.UUID, error) {
	valid, err := validateCreate(senderID, in)
	if err != nil {
		return uuid.Nil, err
	}
	checkCtx, cancel := context.WithTimeout(ctx, attachmentCheckTimeout)
	inspected, err := s.finalizer.Inspect(checkCtx, s.queries, senderID, in.ImageUploadIDs)
	cancel()
	if err != nil {
		return uuid.Nil, err
	}

	var created createdKudo
	err = dbx.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		var txErr error
		created, txErr = s.insert(ctx, db.New(tx), senderID, in, valid, inspected)
		return txErr
	})
	if err != nil {
		return uuid.Nil, err
	}
	s.notifyAfterCommit(ctx, senderID, in.ReceiverID, created)
	return created.id, nil
}

func (s *CreateService) insert(ctx context.Context, q *db.Queries, senderID uuid.UUID, in CreateInput,
	valid validKudo, inspected []upload.InspectedUpload) (createdKudo, error) {
	if _, err := q.LockReceiverForKudoCreate(ctx, in.ReceiverID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return createdKudo{}, &ValidationError{Fields: []FieldError{{"receiverId", fieldUnavailable}}}
		}
		return createdKudo{}, fmt.Errorf("lock receiver: %w", err)
	}
	before, err := q.CountDistinctPublicSenders(ctx, in.ReceiverID)
	if err != nil {
		return createdKudo{}, fmt.Errorf("count senders before: %w", err)
	}
	kudoID, err := q.InsertKudo(ctx, db.InsertKudoParams{
		SenderID: senderID, ReceiverID: in.ReceiverID, Title: valid.title, Content: valid.content, IsAnonymous: in.IsAnonymous,
	})
	if err != nil {
		return createdKudo{}, fmt.Errorf("insert kudo: %w", err)
	}
	if err := linkHashtags(ctx, q, kudoID, valid.hashtags); err != nil {
		return createdKudo{}, err
	}
	if err := s.finalizer.Attach(ctx, q, senderID, kudoID, inspected); err != nil {
		return createdKudo{}, err
	}
	for i, u := range inspected {
		if err := q.InsertKudoImage(ctx, db.InsertKudoImageParams{KudoID: kudoID, UploadID: u.ID, Position: int16(i)}); err != nil {
			return createdKudo{}, fmt.Errorf("insert kudo image: %w", err)
		}
	}
	after, err := q.CountDistinctPublicSenders(ctx, in.ReceiverID)
	if err != nil {
		return createdKudo{}, fmt.Errorf("count senders after: %w", err)
	}
	created := createdKudo{id: kudoID, transition: heroTransition(in.ReceiverID, senderID, int(before), int(after))}
	if !in.IsAnonymous {
		sender, err := q.GetKudoSenderBrief(ctx, senderID)
		if err != nil {
			return createdKudo{}, fmt.Errorf("read sender: %w", err)
		}
		created.sender = &sender
	}
	return created, nil
}

// linkHashtags creates the new names and links every name to the kudo (BR-002,
// FR-002), on create and on edit.
func linkHashtags(ctx context.Context, q *db.Queries, kudoID uuid.UUID, names []string) error {
	if err := q.UpsertHashtags(ctx, names); err != nil {
		// Safety net for a future Go/ICU Unicode drift in lower-casing: a name
		// the database check refuses is the caller's input, never a 500 (W1).
		if dbx.IsConstraintViolation(err, dbx.CheckViolation, "hashtags_name_normalized") {
			return &ValidationError{Fields: []FieldError{{"hashtags", fieldInvalid}}}
		}
		return fmt.Errorf("upsert hashtags: %w", err)
	}
	if err := q.LinkKudoHashtags(ctx, db.LinkKudoHashtagsParams{KudoID: kudoID, Names: names}); err != nil {
		return fmt.Errorf("link hashtags: %w", err)
	}
	return nil
}

// notifyAfterCommit: an anonymous kudo's notice carries no sender field at
// all, and F009 strips them again if the kudo is anonymous at insert time (N01).
func (s *CreateService) notifyAfterCommit(ctx context.Context, senderID, receiverID uuid.UUID, created createdKudo) {
	nctx, cancel := notification.PostCommitContext(ctx)
	defer cancel()
	params := map[string]any{}
	if created.sender != nil {
		params[notification.ParamSenderID] = created.sender.ID
		params[notification.ParamSenderName] = created.sender.Name
		params[notification.ParamSenderAvatarURL] = created.sender.AvatarUrl
	}
	kudoID := created.id
	s.notifier.Create(nctx, notification.CreateInput{
		RecipientID: receiverID, ActorID: senderID, Kind: notification.KindKudoReceived, Params: params, KudoID: &kudoID,
	})
	if created.transition != nil {
		s.notifier.Create(nctx, notification.HeroLevelUpInput(*created.transition))
	}
}
