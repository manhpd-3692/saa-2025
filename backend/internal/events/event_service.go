// Package events serves the current SAA event (F003 A3).
package events

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// ErrNoEvent means no events row exists (callers fail open, D003).
var ErrNoEvent = errors.New("no current event")

// Status values of the current event (BR-001).
const (
	StatusUpcoming = "upcoming"
	StatusActive   = "active"
)

// CurrentEvent is the A3 response; timestamps are ISO 8601 with offset.
type CurrentEvent struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	StartAt        time.Time `json:"startAt"`
	CeremonyAt     time.Time `json:"ceremonyAt"`
	Venue          *string   `json:"venue"`
	LivestreamNote *string   `json:"livestreamNote"`
	ServerNow      time.Time `json:"serverNow"`
	Status         string    `json:"status"`
}

// EventReader is the sqlc query behind the service (*db.Queries).
type EventReader interface {
	GetCurrentEvent(ctx context.Context) (db.GetCurrentEventRow, error)
}

// Service is EventService#Current.
type Service struct {
	events EventReader
	now    func() time.Time
}

// NewService reads events through q and stamps serverNow from the Go clock.
func NewService(q EventReader, now func() time.Time) *Service {
	return &Service{events: q, now: now}
}

// Current returns the event with serverNow and the derived status: launched
// only when server time is at or after start_at (BR-001, BR-003).
func (s *Service) Current(ctx context.Context) (CurrentEvent, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	row, err := s.events.GetCurrentEvent(ctx)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return CurrentEvent{}, ErrNoEvent
	case err != nil:
		return CurrentEvent{}, fmt.Errorf("read current event: %w", err)
	}
	now := s.now()
	return CurrentEvent{
		ID: row.ID, Name: row.Name, StartAt: row.StartAt, CeremonyAt: row.CeremonyAt,
		Venue: row.Venue, LivestreamNote: row.LivestreamNote,
		ServerNow: now, Status: statusAt(now, row.StartAt),
	}, nil
}

func statusAt(now, startAt time.Time) string {
	if now.Before(startAt) {
		return StatusUpcoming
	}
	return StatusActive
}
