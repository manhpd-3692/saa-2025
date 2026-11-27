// Package moderation applies admin Spam/Public decisions (F011 A3, A4).
package moderation

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
)

// Decision refusals (BR-002, C03).
var (
	ErrKudoNotFound  = errors.New("kudo not found")
	ErrStaleDecision = errors.New("stale moderation decision")
)

// KudoModeration is the moderation state of a kudo, returned on success and
// as the current row of a 409 stale_decision (Codex R13).
type KudoModeration struct {
	Status            db.KudoStatus `json:"status"`
	ModerationVersion int32         `json:"moderationVersion"`
	ModeratedBy       *uuid.UUID    `json:"moderatedBy"`
	ModeratedAt       *time.Time    `json:"moderatedAt"`
}

// Decision is the outcome of SetStatus; on ErrStaleDecision Kudo is the current row.
type Decision struct {
	Changed bool           `json:"changed"`
	Kudo    KudoModeration `json:"kudo"`
}

// Service is ModerationService.
type Service struct {
	pool     dbx.TxBeginner
	notifier notification.Notifier
}

// NewService wires the pool and the post-commit notifier.
func NewService(pool dbx.TxBeginner, notifier notification.Notifier) *Service {
	return &Service{pool: pool, notifier: notifier}
}

// SetStatus is ALG-001: lock the kudo row, then the receiver's users row
// (global order kudo -> receiver, N05), then a versioned compare-and-set. A
// moved version is ErrStaleDecision with the current row; the same target at
// the current version is changed=false; no row is ErrKudoNotFound (N08). Only
// a real change to Spam warns the author, after commit; no tier notice is ever
// emitted from here (N05).
func (s *Service) SetStatus(ctx context.Context, adminID, kudoID uuid.UUID, target db.KudoStatus, expectedVersion int32) (Decision, error) {
	var decision Decision
	var senderID uuid.UUID
	err := dbx.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		q := db.New(tx)
		current, err := q.LockKudoForModeration(ctx, kudoID)
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			return ErrKudoNotFound
		case err != nil:
			return fmt.Errorf("lock kudo: %w", err)
		}
		if _, err := q.LockKudoReceiverForModeration(ctx, current.ReceiverID); err != nil {
			return fmt.Errorf("lock receiver: %w", err)
		}
		row, err := q.SetKudoStatus(ctx, db.SetKudoStatusParams{
			Status: target, ModeratedBy: &adminID, ID: kudoID, ExpectedVersion: expectedVersion,
		})
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			decision.Kudo = KudoModeration{
				Status: current.Status, ModerationVersion: current.ModerationVersion,
				ModeratedBy: current.ModeratedBy, ModeratedAt: current.ModeratedAt,
			}
			if current.ModerationVersion != expectedVersion {
				return ErrStaleDecision
			}
			return nil // same target at the current version: no write, no notice
		case err != nil:
			return fmt.Errorf("set kudo status: %w", err)
		}
		senderID = row.SenderID
		decision = Decision{Changed: true, Kudo: KudoModeration{
			Status: row.Status, ModerationVersion: row.ModerationVersion,
			ModeratedBy: row.ModeratedBy, ModeratedAt: row.ModeratedAt,
		}}
		return nil
	})
	if err != nil {
		return decision, err
	}
	if decision.Changed && target == db.KudoStatusSpam {
		nctx, cancel := notification.PostCommitContext(ctx)
		defer cancel()
		s.notifier.Create(nctx, notification.CreateInput{
			RecipientID: senderID, ActorID: adminID, Kind: notification.KindKudoSpamWarning,
			KudoID: &kudoID, DedupeKey: "kudo_spam:" + kudoID.String(),
		})
	}
	return decision, nil
}
