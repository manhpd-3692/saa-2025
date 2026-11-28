package gamification

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// SenderCounter is the sqlc query behind HeroTiersFor (*db.Queries).
type SenderCounter interface {
	CountDistinctSendersByReceivers(ctx context.Context, receiverIDs []uuid.UUID) ([]db.CountDistinctSendersByReceiversRow, error)
}

// HeroTiersFor is HeroTierService.TiersFor (F008 A4): the tier of each user,
// TierNone for users without public kudos received.
func HeroTiersFor(ctx context.Context, q SenderCounter, userIDs []uuid.UUID) (map[uuid.UUID]HeroTier, error) {
	rows, err := q.CountDistinctSendersByReceivers(ctx, userIDs)
	if err != nil {
		return nil, fmt.Errorf("count distinct senders: %w", err)
	}
	tiers := make(map[uuid.UUID]HeroTier, len(userIDs))
	for _, row := range rows {
		tiers[row.ReceiverID] = HeroTierFor(int(row.Senders))
	}
	return tiers, nil
}
