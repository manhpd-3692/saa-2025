package gamification

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
)

// Heart refusals (F008 DEC-002).
var (
	ErrKudoNotFound   = errors.New("kudo not found")
	ErrCannotHeartOwn = errors.New("the sender cannot heart their own kudo")
	ErrKudoNotPublic  = errors.New("kudo is not public")
	ErrCampaignLookup = errors.New("campaign lookup failed")
)

// HeartState is the A1 response: the weighted total and the viewer's state.
type HeartState struct {
	HeartTotal    int64 `json:"heartTotal"`
	ViewerHearted bool  `json:"viewerHearted"`
}

// HeartService is F008 A1: PUT/DELETE /api/v1/kudos/{id}/heart.
type HeartService struct {
	pool      dbx.TxBeginner
	campaigns CampaignReader
	notifier  notification.Notifier
}

// NewHeartService wires the pool, the in-transaction campaign lookup and the
// post-commit notifier.
func NewHeartService(pool dbx.TxBeginner, campaigns CampaignReader, notifier notification.Notifier) *HeartService {
	return &HeartService{pool: pool, campaigns: campaigns, notifier: notifier}
}

// heartEffects is what the committed transaction did, for the notifications.
type heartEffects struct {
	senderID     uuid.UUID
	receiverName string
	heartAdded   bool
	boxesGranted int64
}

// Set gives (hearted=true) or withdraws (false) the viewer's heart. Both are
// idempotent setters (BR-001). One transaction: lock the kudo, check BR-002 and
// BR-003, look up the campaign weight (a failure rolls back with
// ErrCampaignLookup, R09), write the heart, top up the sender's boxes; then,
// after commit, notify best-effort under a detached 2 s context (R23).
func (s *HeartService) Set(ctx context.Context, viewerID, kudoID uuid.UUID, hearted bool) (HeartState, error) {
	var state HeartState
	var fx heartEffects
	err := dbx.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		q := db.New(tx)
		kudo, err := q.GetKudoForHeartForUpdate(ctx, kudoID)
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			return ErrKudoNotFound
		case err != nil:
			return fmt.Errorf("lock kudo for heart: %w", err)
		case kudo.SenderID == viewerID:
			return ErrCannotHeartOwn
		case kudo.Status != db.KudoStatusPublic:
			return ErrKudoNotPublic
		}
		fx.senderID, fx.receiverName = kudo.SenderID, kudo.ReceiverName

		if hearted {
			if fx.heartAdded, fx.boxesGranted, err = s.addHeart(ctx, q, viewerID, kudo.ID, kudo.SenderID); err != nil {
				return err
			}
		} else if _, err := q.DeleteHeart(ctx, db.DeleteHeartParams{KudoID: kudoID, UserID: viewerID}); err != nil {
			return fmt.Errorf("delete heart: %w", err)
		}

		row, err := q.GetKudoHeartStateForViewer(ctx, db.GetKudoHeartStateForViewerParams{ViewerID: viewerID, KudoID: kudoID})
		if err != nil {
			return fmt.Errorf("read heart state: %w", err)
		}
		state = HeartState{HeartTotal: row.HeartTotal, ViewerHearted: row.ViewerHearted}
		return nil
	})
	if err != nil {
		return HeartState{}, err
	}
	s.notifyAfterCommit(ctx, viewerID, kudoID, fx)
	return state, nil
}

// addHeart inserts the heart with the campaign weight read inside this
// transaction and, only when a heart was actually added, tops up the sender's
// boxes (ALG-002). There is no weight-1 fallback on a lookup error (R09).
func (s *HeartService) addHeart(ctx context.Context, q *db.Queries, viewerID, kudoID, senderID uuid.UUID) (bool, int64, error) {
	weight, err := s.campaigns.HeartWeight(ctx, q)
	if err != nil {
		return false, 0, fmt.Errorf("%w: %w", ErrCampaignLookup, err)
	}
	added, err := q.InsertHeart(ctx, db.InsertHeartParams{
		KudoID: kudoID, UserID: viewerID, Weight: weight.Weight, CampaignID: weight.CampaignID,
	})
	if err != nil {
		return false, 0, fmt.Errorf("insert heart: %w", err)
	}
	if added == 0 {
		return false, 0, nil // already hearted: nothing changes (BR-001)
	}
	granted, err := topUpSecretBoxes(ctx, q, senderID)
	if err != nil {
		return false, 0, err
	}
	return true, granted, nil
}

// notifyAfterCommit sends heart_received (only for a heart actually added,
// merged per kudo while unread) and secret_box_received (when boxes were
// granted) to the kudo's sender.
func (s *HeartService) notifyAfterCommit(ctx context.Context, viewerID, kudoID uuid.UUID, fx heartEffects) {
	if !fx.heartAdded {
		return
	}
	nctx, cancel := notification.PostCommitContext(ctx)
	defer cancel()
	s.notifier.Create(nctx, notification.CreateInput{
		RecipientID: fx.senderID,
		ActorID:     viewerID,
		Kind:        notification.KindHeartReceived,
		Params:      map[string]any{"receiverName": fx.receiverName},
		KudoID:      &kudoID,
		DedupeKey:   "heart:" + kudoID.String(),
	})
	if fx.boxesGranted > 0 {
		s.notifier.Create(nctx, notification.CreateInput{
			RecipientID: fx.senderID,
			ActorID:     viewerID,
			Kind:        notification.KindSecretBoxReceived,
		})
	}
}
