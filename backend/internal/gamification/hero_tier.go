// Package gamification holds hearts, hero tiers and secret boxes (F008).
package gamification

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// HeroTier is the badge derived from a Sunner's distinct senders over public
// kudos received (BR-005). It is computed on read and never stored.
type HeroTier string

// Tier keys (translated on render). TierNone means no badge (DEC-003).
const (
	TierNone   HeroTier = ""
	TierNew    HeroTier = "New"
	TierRising HeroTier = "Rising"
	TierSuper  HeroTier = "Super"
	TierLegend HeroTier = "Legend"
)

// BR-005 thresholds: New 1–4, Rising 5–9, Super 10–20, Legend more than 20.
const (
	risingFromSenders = 5
	superFromSenders  = 10
	legendFromSenders = 21
)

// HeroTierFor maps a distinct-sender count to its tier (ALG-001).
func HeroTierFor(senders int) HeroTier {
	switch {
	case senders <= 0:
		return TierNone
	case senders < risingFromSenders:
		return TierNew
	case senders < superFromSenders:
		return TierRising
	case senders < legendFromSenders:
		return TierSuper
	default:
		return TierLegend
	}
}

// HeroTierRose reports whether moving from `before` to `after` distinct senders
// reaches a higher tier (F005 ALG-003, Codex R10).
func HeroTierRose(before, after int) bool {
	return tierRank(HeroTierFor(after)) > tierRank(HeroTierFor(before))
}

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

func tierRank(t HeroTier) int {
	switch t {
	case TierNew:
		return 1
	case TierRising:
		return 2
	case TierSuper:
		return 3
	case TierLegend:
		return 4
	default:
		return 0
	}
}
