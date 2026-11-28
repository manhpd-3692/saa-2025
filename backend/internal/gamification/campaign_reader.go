package gamification

import (
	"context"
	"errors"
	"fmt"
	"time"

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

// ActiveCampaign is the campaign whose multiplier a heart given now gets: the
// active one with the highest multiplier (G14). A3 shows it; A1 stores its weight.
type ActiveCampaign struct {
	ID         uuid.UUID `json:"-"`
	Name       string    `json:"name"`
	Multiplier int32     `json:"multiplier"`
	StartsAt   time.Time `json:"startsAt"`
	EndsAt     time.Time `json:"endsAt"`
}

// activeCampaignQuery is the one INT-001 lookup (*db.Queries).
type activeCampaignQuery interface {
	GetActiveCampaignWithMaxMultiplier(ctx context.Context) (db.GetActiveCampaignWithMaxMultiplierRow, error)
}

// LookupActiveCampaign is INT-001: the active campaign with the highest
// multiplier, nil when the lookup succeeded and none is active, or an error.
// It never substitutes a default on error (Codex R09).
func LookupActiveCampaign(ctx context.Context, q activeCampaignQuery) (*ActiveCampaign, error) {
	row, err := q.GetActiveCampaignWithMaxMultiplier(ctx)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return nil, nil
	case err != nil:
		return nil, fmt.Errorf("read active campaign: %w", err)
	}
	return &ActiveCampaign{ID: row.ID, Name: row.Name, Multiplier: row.Multiplier, StartsAt: row.StartsAt, EndsAt: row.EndsAt}, nil
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
	campaign, err := LookupActiveCampaign(ctx, q)
	if err != nil {
		return HeartWeight{}, err
	}
	if campaign == nil {
		return HeartWeight{Weight: DefaultHeartWeight}, nil
	}
	id := campaign.ID
	return HeartWeight{Weight: campaign.Multiplier, CampaignID: &id}, nil
}
