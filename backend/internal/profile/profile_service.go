// Package profile serves the Sunner profile pages (F007): the profile header
// with its counts and the received / sent kudo lists.
package profile

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
)

// PageSize is PROFILE_KUDOS_PAGE_SIZE (BR-005, technical-spec § 4.6).
const PageSize = 10

// ErrUserNotFound covers an id that names no Sunner (FR-104).
var ErrUserNotFound = errors.New("user not found")

// Queries are the sqlc reads of the profile (*db.Queries): profile.sql plus
// the F008 secret-box summary reads (INT-001).
type Queries interface {
	GetProfileUser(ctx context.Context, id uuid.UUID) (db.GetProfileUserRow, error)
	ProfileUserExists(ctx context.Context, id uuid.UUID) (bool, error)
	GetProfileKudoCounts(ctx context.Context, arg db.GetProfileKudoCountsParams) (db.GetProfileKudoCountsRow, error)
	ListProfileKudosReceived(ctx context.Context, arg db.ListProfileKudosReceivedParams) ([]db.ListProfileKudosReceivedRow, error)
	ListProfileKudosSent(ctx context.Context, arg db.ListProfileKudosSentParams) ([]db.ListProfileKudosSentRow, error)
	CountSecretBoxes(ctx context.Context, userID uuid.UUID) (db.CountSecretBoxesRow, error)
	ListCollectedIcons(ctx context.Context, userID uuid.UUID) ([]*db.SecretBoxIcon, error)
	GetIconsCompleted(ctx context.Context, id uuid.UUID) (bool, error)
}

// User is the profile header identity; email is never part of it (FR-605).
type User struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	UnitCode  *string   `json:"unitCode"` // units.code, null without a unit (Codex R15)
}

// Counts are the profile figures. The box figures exist only for the owner
// (BR-004, SC-007): for anyone else the keys are absent from the JSON.
type Counts struct {
	KudosReceived  int32  `json:"kudosReceived"`
	KudosSent      int32  `json:"kudosSent"`
	HeartsReceived int64  `json:"heartsReceived"` // weighted total (G08, X07)
	BoxesOpened    *int32 `json:"boxesOpened,omitempty"`
	BoxesUnopened  *int32 `json:"boxesUnopened,omitempty"`
}

// Profile is the A1/A2 answer. A failed count query or F008 summary leaves
// counts null with countsUnavailable (and collectedIcons null when the
// summary failed) while the header still renders (Codex R15, C02).
type Profile struct {
	User              User               `json:"user"`
	Counts            *Counts            `json:"counts"`
	CountsUnavailable bool               `json:"countsUnavailable"`
	CollectedIcons    []db.SecretBoxIcon `json:"collectedIcons"`
	IsOwner           bool               `json:"isOwner"`
	degraded          error              // why counts are unavailable; logged by the handler
}

// Service is ProfileService (technical-spec § 4.1).
type Service struct {
	queries Queries
	cards   *kudo.ReadService
}

// NewService wires the queries and F006's card assembly (INT-002).
func NewService(queries Queries, cards *kudo.ReadService) *Service {
	return &Service{queries: queries, cards: cards}
}

// includeAnonymousSent is BR-002: a Sunner's anonymous sends count and list
// only for the Sunner themself and for admins.
func includeAnonymousSent(viewer kudo.Viewer, ownerID uuid.UUID) bool {
	return viewer.ID == ownerID || viewer.IsAdmin
}

// Get is A1/A2: the header, the counts with the list's visibility rules
// (FR-403) and the collected icons; box figures only for the owner.
func (s *Service) Get(ctx context.Context, viewer kudo.Viewer, userID uuid.UUID) (Profile, error) {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	row, err := s.queries.GetProfileUser(dbCtx, userID)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return Profile{}, ErrUserNotFound
	case err != nil:
		return Profile{}, fmt.Errorf("read profile user: %w", err)
	}
	isOwner := viewer.ID == userID
	profile := Profile{
		User:    User{ID: row.ID, Name: row.Name, AvatarURL: row.AvatarUrl, UnitCode: row.UnitCode},
		IsOwner: isOwner,
	}
	counts, countsErr := s.queries.GetProfileKudoCounts(dbCtx, db.GetProfileKudoCountsParams{
		OwnerID: userID, IncludeAnonymousSent: includeAnonymousSent(viewer, userID),
	})
	summary, summaryErr := gamification.ReadSecretBoxSummary(dbCtx, s.queries, userID)
	if summaryErr == nil {
		profile.CollectedIcons = summary.CollectedIcons
	}
	if err := errors.Join(countsErr, summaryErr); err != nil {
		profile.CountsUnavailable, profile.degraded = true, err
		return profile, nil
	}
	profile.Counts = &Counts{KudosReceived: counts.KudosReceived, KudosSent: counts.KudosSent, HeartsReceived: counts.HeartsReceived}
	if isOwner {
		profile.Counts.BoxesOpened, profile.Counts.BoxesUnopened = &summary.Opened, &summary.Unopened
	}
	return profile, nil
}
