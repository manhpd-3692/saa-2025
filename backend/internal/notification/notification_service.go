package notification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"maps"

	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// Service is NotificationService (F009 A1).
type Service struct {
	pool dbx.TxBeginner
}

// NewService builds the service over the saa_api pool.
func NewService(pool dbx.TxBeginner) *Service { return &Service{pool: pool} }

var _ Notifier = (*Service)(nil)

// Create stores one notification and never returns an error (BR-006): a
// failure, timeout or panic is logged as a warning and the caller's committed
// mutation stays untouched. Callers pass PostCommitContext(reqCtx).
func (s *Service) Create(ctx context.Context, in CreateInput) {
	defer func() {
		if rec := recover(); rec != nil {
			slog.WarnContext(ctx, "notification create panicked",
				"recipient_id", in.RecipientID, "kind", in.Kind, "panic", rec)
		}
	}()
	if in.ActorID == in.RecipientID {
		return // BR-003: nobody is notified about their own action
	}
	if err := s.store(ctx, in); err != nil {
		slog.WarnContext(ctx, "notification create failed",
			"recipient_id", in.RecipientID, "kind", in.Kind, "error", err)
	}
}

// store writes the row in its own short transaction: kudo anonymity under
// `for share` (N01), then the once-ever insert (N03) or the unread merge (BR-004).
func (s *Service) store(ctx context.Context, in CreateInput) error {
	if !in.Kind.Valid() {
		return fmt.Errorf("unknown notification kind %q", in.Kind)
	}
	if in.Kind.onceEver() && in.DedupeKey == "" {
		return fmt.Errorf("kind %q needs a dedupe key", in.Kind)
	}
	params := maps.Clone(in.Params)
	if params == nil {
		params = map[string]any{}
	}
	var dedupe *string
	if in.DedupeKey != "" {
		dedupe = &in.DedupeKey
	}

	return dbx.WithTxTimeout(ctx, s.pool, PostCommitTimeout, func(ctx context.Context, tx pgx.Tx) error {
		q := db.New(tx)
		if in.KudoID != nil {
			anonymous, err := q.LockKudoAnonymity(ctx, *in.KudoID)
			if err != nil {
				return fmt.Errorf("lock kudo anonymity: %w", err)
			}
			if anonymous {
				stripSenderParams(params)
			}
		}
		raw, err := json.Marshal(params)
		if err != nil {
			return fmt.Errorf("encode params: %w", err)
		}
		if in.Kind.onceEver() {
			_, err = q.InsertOnceNotification(ctx, db.InsertOnceNotificationParams{
				RecipientID: in.RecipientID, Kind: string(in.Kind), Params: raw, KudoID: in.KudoID, DedupeKey: dedupe,
			})
			if errors.Is(err, pgx.ErrNoRows) {
				return nil // a once-ever duplicate stores nothing
			}
		} else {
			_, err = q.UpsertNotification(ctx, db.UpsertNotificationParams{
				RecipientID: in.RecipientID, Kind: string(in.Kind), Params: raw, KudoID: in.KudoID, DedupeKey: dedupe,
			})
		}
		if err != nil {
			return fmt.Errorf("store notification: %w", err)
		}
		return nil
	})
}

// stripSenderParams removes every sender field (BR-002).
func stripSenderParams(params map[string]any) {
	for _, key := range senderParams {
		delete(params, key)
	}
}
