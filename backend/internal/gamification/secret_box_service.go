package gamification

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
)

// Box-open refusals (F008 DEC-004).
var (
	ErrNoUnopenedBox = errors.New("no unopened secret box")
	// ErrIdempotencyKeyInUse: the key already opened another Sunner's box (keys are globally unique).
	ErrIdempotencyKeyInUse = errors.New("idempotency key already used")
)

const uniqueViolation = "23505"

// OpenResult is the A6 response, stored verbatim in secret_boxes.open_result (N12).
type OpenResult struct {
	BoxID   uuid.UUID        `json:"boxId"`
	Icon    db.SecretBoxIcon `json:"icon"`
	Summary OpenSummary      `json:"summary"`
}

// OpenSummary is the caller's inventory right after this open.
type OpenSummary struct {
	Unopened      int32              `json:"unopened"`
	Opened        int32              `json:"opened"`
	DistinctIcons []db.SecretBoxIcon `json:"distinctIcons"`
}

// SecretBoxService opens secret boxes (F008 A6, ALG-004).
type SecretBoxService struct {
	pool     dbx.TxBeginner
	notifier notification.Notifier
	random   io.Reader
}

// NewSecretBoxService wires the pool, the post-commit notifier and the entropy
// source of the icon draw (crypto/rand.Reader in production).
func NewSecretBoxService(pool dbx.TxBeginner, notifier notification.Notifier, random io.Reader) *SecretBoxService {
	return &SecretBoxService{pool: pool, notifier: notifier, random: random}
}

// Open opens the caller's oldest unopened box for one opening intent (the
// Idempotency-Key). The users row lock serializes the caller's opens (R11); a
// key that already opened a box replays its stored JSON and consumes nothing
// (R12, N12). The first open that reaches all six icons sets
// users.icons_completed_at and stores the icons_completed notice in the same
// transaction (exactly once, review W3), then also hands it to the notifier
// after commit, which the once-ever dedupe turns into a no-op unless the
// in-transaction write failed.
func (s *SecretBoxService) Open(ctx context.Context, userID, requestID uuid.UUID) (json.RawMessage, error) {
	var result json.RawMessage
	completed := false
	err := dbx.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		q := db.New(tx)
		if _, err := q.LockUserForSecretBoxOpen(ctx, userID); err != nil {
			return fmt.Errorf("lock user for box open: %w", err)
		}
		stored, err := q.GetSecretBoxOpenResult(ctx, db.GetSecretBoxOpenResultParams{UserID: userID, OpenRequestID: &requestID})
		switch {
		case err == nil:
			result = stored
			return nil
		case !errors.Is(err, pgx.ErrNoRows):
			return fmt.Errorf("read stored open result: %w", err)
		}
		var openErr error
		result, completed, openErr = s.openOldest(ctx, tx, userID, requestID)
		return openErr
	})
	if err != nil {
		return nil, err
	}
	if completed {
		nctx, cancel := notification.PostCommitContext(ctx)
		defer cancel()
		s.notifier.Create(nctx, completionNotice(userID))
	}
	return result, nil
}

// openOldest draws an icon for the oldest unopened box and stores the response.
func (s *SecretBoxService) openOldest(ctx context.Context, tx pgx.Tx, userID, requestID uuid.UUID) (json.RawMessage, bool, error) {
	q := db.New(tx)
	before, err := collectedIcons(ctx, q, userID)
	if err != nil {
		return nil, false, err
	}
	boxID, err := q.LockOldestUnopenedSecretBox(ctx, userID)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return nil, false, ErrNoUnopenedBox
	case err != nil:
		return nil, false, fmt.Errorf("lock oldest unopened box: %w", err)
	}
	counts, err := q.CountSecretBoxes(ctx, userID)
	if err != nil {
		return nil, false, fmt.Errorf("count secret boxes: %w", err)
	}
	icon, err := drawIcon(s.random)
	if err != nil {
		return nil, false, err
	}
	after := iconsAfter(before, icon)

	completed := false
	if len(before) < IconCount && len(after) == IconCount {
		updated, err := q.SetIconsCompletedAt(ctx, userID)
		if err != nil {
			return nil, false, fmt.Errorf("set icons completed: %w", err)
		}
		completed = updated == 1
		if completed {
			storeCompletionNotice(ctx, tx, userID)
		}
	}

	payload, err := json.Marshal(OpenResult{
		BoxID: boxID, Icon: icon,
		Summary: OpenSummary{Unopened: counts.Unopened - 1, Opened: counts.Opened + 1, DistinctIcons: after},
	})
	if err != nil {
		return nil, false, fmt.Errorf("encode open result: %w", err)
	}
	stored, err := q.MarkSecretBoxOpened(ctx, db.MarkSecretBoxOpenedParams{
		ID: boxID, Icon: &icon, OpenRequestID: &requestID, OpenResult: payload,
	})
	var pgErr *pgconn.PgError
	switch {
	case errors.As(err, &pgErr) && pgErr.Code == uniqueViolation:
		return nil, false, ErrIdempotencyKeyInUse
	case err != nil:
		return nil, false, fmt.Errorf("mark box opened: %w", err)
	}
	return stored, completed, nil
}

// SecretBoxSummary is A5 (GET /api/v1/me/secret-boxes): the caller's current
// inventory. collectedIcons is the same distinct list an open returns as
// summary.distinctIcons (C04); completed mirrors users.icons_completed_at (R11).
type SecretBoxSummary struct {
	Unopened       int32              `json:"unopened"`
	Opened         int32              `json:"opened"`
	CollectedIcons []db.SecretBoxIcon `json:"collectedIcons"`
	TotalIcons     int                `json:"totalIcons"`
	Completed      bool               `json:"completed"`
}

// summaryQueries are the sqlc reads behind ReadSecretBoxSummary (*db.Queries).
type summaryQueries interface {
	iconLister
	CountSecretBoxes(ctx context.Context, userID uuid.UUID) (db.CountSecretBoxesRow, error)
	GetIconsCompleted(ctx context.Context, id uuid.UUID) (bool, error)
}

// ReadSecretBoxSummary is SecretBoxService.Summary (A5); F007's profile reuses
// it for the owner. Reads only; the open transaction stays authoritative.
func ReadSecretBoxSummary(ctx context.Context, q summaryQueries, userID uuid.UUID) (SecretBoxSummary, error) {
	counts, err := q.CountSecretBoxes(ctx, userID)
	if err != nil {
		return SecretBoxSummary{}, fmt.Errorf("count secret boxes: %w", err)
	}
	icons, err := collectedIcons(ctx, q, userID)
	if err != nil {
		return SecretBoxSummary{}, err
	}
	completed, err := q.GetIconsCompleted(ctx, userID)
	if err != nil {
		return SecretBoxSummary{}, fmt.Errorf("read icons completed: %w", err)
	}
	return SecretBoxSummary{Unopened: counts.Unopened, Opened: counts.Opened, CollectedIcons: icons,
		TotalIcons: IconCount, Completed: completed}, nil
}
