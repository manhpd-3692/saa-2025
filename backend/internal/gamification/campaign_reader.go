package gamification

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// DefaultHeartWeight applies only when the lookup succeeded and found no active
// campaign (BR-004, Codex R09).
const DefaultHeartWeight = 1

// HeartWeight is the weight and campaign a new heart is stored with (G08).
type HeartWeight struct {
	Weight     int32
	CampaignID *uuid.UUID
}

// CampaignReader is the authoritative campaign lookup inside the heart
// transaction (INT-001). It reports an error for a failed lookup and never
// substitutes a default on error (Codex R09).
type CampaignReader interface {
	HeartWeight(ctx context.Context, q *db.Queries) (HeartWeight, error)
}

// DBCampaignReader reads campaigns through the transaction's queries.
type DBCampaignReader struct{}

// HeartWeight returns the highest active multiplier, or weight 1 when no
// campaign is active right now (BR-004).
func (DBCampaignReader) HeartWeight(ctx context.Context, q *db.Queries) (HeartWeight, error) {
	row, err := q.GetActiveCampaignWithMaxMultiplier(ctx)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return HeartWeight{Weight: DefaultHeartWeight}, nil
	case err != nil:
		return HeartWeight{}, fmt.Errorf("read active campaign: %w", err)
	}
	id := row.ID
	return HeartWeight{Weight: row.Multiplier, CampaignID: &id}, nil
}
