package gamification

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// HeartsPerBox is the weighted hearts a Sunner needs per secret box (BR-006).
const HeartsPerBox = 5

// topUpSecretBoxes runs ALG-002 inside the heart transaction after a heart was
// added: lock the sender's users row so concurrent hearts on any of their kudos
// serialize, then insert only sequence numbers above the high-water mark
// floor(weighted hearts received / 5). Boxes are never revoked, so withdraw and
// re-heart cannot farm boxes. Returns the number of boxes granted.
func topUpSecretBoxes(ctx context.Context, q *db.Queries, senderID uuid.UUID) (int64, error) {
	if _, err := q.LockUserForBoxTopUp(ctx, senderID); err != nil {
		return 0, fmt.Errorf("lock sender for box top-up: %w", err)
	}
	total, err := q.SumHeartsOnSentKudos(ctx, senderID)
	if err != nil {
		return 0, fmt.Errorf("sum hearts on sent kudos: %w", err)
	}
	have, err := q.MaxSecretBoxSeq(ctx, senderID)
	if err != nil {
		return 0, fmt.Errorf("read box high-water mark: %w", err)
	}
	should := int32(total / HeartsPerBox)
	if should <= have {
		return 0, nil
	}
	granted, err := q.InsertSecretBoxes(ctx, db.InsertSecretBoxesParams{UserID: senderID, FromSeq: have + 1, ToSeq: should})
	if err != nil {
		return 0, fmt.Errorf("insert secret boxes: %w", err)
	}
	return granted, nil
}
