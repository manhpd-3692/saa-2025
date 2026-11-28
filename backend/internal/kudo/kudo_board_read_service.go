package kudo

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// Board aggregates configuration (F006 § 4.6).
const (
	SpotlightMaxNames = 100 // SPOTLIGHT_MAX_NAMES
	SpotlightRecent   = 6   // lines of the Spotlight ticker
	// SidebarRecipients is SIDEBAR_RECIPIENTS (FR-210): F008's GIFT_RECIPIENTS_LIMIT.
	SidebarRecipients = gamification.GiftRecipientsLimit
)

// FilterOptions is F006 A3: the Highlight Hashtag and Phòng ban choices.
type FilterOptions struct {
	Hashtags []HashtagOption `json:"hashtags"`
	Units    []UnitOption    `json:"units"`
}

// HashtagOption is one hashtag found on a public kudo.
type HashtagOption struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// UnitOption is one department; the design lists its code.
type UnitOption struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Code string    `json:"code"`
}

// Spotlight is F006 A4: the public kudos counter, the receivers by kudos
// received (ALG-002 sizes them on the client) and the latest receivers.
type Spotlight struct {
	Total  int32            `json:"total"`
	Names  []SpotlightName  `json:"names"`
	Recent []SpotlightEvent `json:"recent"`
}

// SpotlightName is one name in the word cloud.
type SpotlightName struct {
	UserID uuid.UUID `json:"userId"`
	Name   string    `json:"name"`
	Count  int32     `json:"count"`
}

// SpotlightEvent is one ticker line: a receiver and when the kudo arrived.
type SpotlightEvent struct {
	ReceiverID   uuid.UUID `json:"receiverId"`
	ReceiverName string    `json:"receiverName"`
	CreatedAt    time.Time `json:"createdAt"`
}

// Sidebar is F006 A6: the viewer's own numbers (never another user's) and the
// Sunners who most recently opened a secret box (D006, F008 A7).
type Sidebar struct {
	Stats            ViewerStats                  `json:"stats"`
	LatestRecipients []gamification.GiftRecipient `json:"latestRecipients"`
}

// ViewerStats is FR-208; heartsReceived is the weighted total (G08, X07).
type ViewerStats struct {
	KudosReceived  int32 `json:"kudosReceived"`
	KudosSent      int32 `json:"kudosSent"`
	HeartsReceived int64 `json:"heartsReceived"`
	BoxesOpened    int32 `json:"boxesOpened"`
	BoxesUnopened  int32 `json:"boxesUnopened"`
}

// BoardReadService reads the board aggregates (A3, A4, A6); public kudos only (BR-001).
type BoardReadService struct {
	queries *db.Queries
}

// NewBoardReadService wires the pool queries.
func NewBoardReadService(queries *db.Queries) *BoardReadService {
	return &BoardReadService{queries: queries}
}

// FilterOptions lists hashtags on public kudos and every unit.
func (s *BoardReadService) FilterOptions(ctx context.Context) (FilterOptions, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	tags, err := s.queries.ListPublicKudoHashtags(ctx)
	if err != nil {
		return FilterOptions{}, fmt.Errorf("list public kudo hashtags: %w", err)
	}
	units, err := s.queries.ListUnits(ctx)
	if err != nil {
		return FilterOptions{}, fmt.Errorf("list units: %w", err)
	}
	options := FilterOptions{Hashtags: make([]HashtagOption, len(tags)), Units: make([]UnitOption, len(units))}
	for i, tag := range tags {
		options.Hashtags[i] = HashtagOption{ID: tag.ID, Name: tag.Name}
	}
	for i, unit := range units {
		options.Units[i] = UnitOption{ID: unit.ID, Name: unit.Name, Code: unit.Code}
	}
	return options, nil
}

// Spotlight counts public kudos and their receivers (BR-001, BR-004 runs on the client).
func (s *BoardReadService) Spotlight(ctx context.Context) (Spotlight, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	total, err := s.queries.CountPublicKudos(ctx)
	if err != nil {
		return Spotlight{}, fmt.Errorf("count public kudos: %w", err)
	}
	names, err := s.queries.ListSpotlightReceivers(ctx, SpotlightMaxNames)
	if err != nil {
		return Spotlight{}, fmt.Errorf("list spotlight receivers: %w", err)
	}
	recent, err := s.queries.ListLatestPublicKudoReceivers(ctx, SpotlightRecent)
	if err != nil {
		return Spotlight{}, fmt.Errorf("list latest kudo receivers: %w", err)
	}
	board := Spotlight{Total: total, Names: make([]SpotlightName, len(names)), Recent: make([]SpotlightEvent, len(recent))}
	for i, n := range names {
		board.Names[i] = SpotlightName{UserID: n.ID, Name: n.Name, Count: n.Kudos}
	}
	for i, r := range recent {
		board.Recent[i] = SpotlightEvent{ReceiverID: r.ReceiverID, ReceiverName: r.ReceiverName, CreatedAt: r.CreatedAt}
	}
	return board, nil
}

// Sidebar reads the viewer's stats, box counts and the latest gift recipients.
func (s *BoardReadService) Sidebar(ctx context.Context, viewer Viewer) (Sidebar, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	stats, err := s.queries.GetViewerKudoStats(ctx, viewer.ID)
	if err != nil {
		return Sidebar{}, fmt.Errorf("read viewer kudo stats: %w", err)
	}
	boxes, err := s.queries.CountSecretBoxes(ctx, viewer.ID)
	if err != nil {
		return Sidebar{}, fmt.Errorf("count secret boxes: %w", err)
	}
	recipients, err := gamification.LatestGiftRecipients(ctx, s.queries, SidebarRecipients)
	if err != nil {
		return Sidebar{}, err
	}
	return Sidebar{
		Stats: ViewerStats{
			KudosReceived: stats.KudosReceived, KudosSent: stats.KudosSent, HeartsReceived: stats.HeartsReceived,
			BoxesOpened: boxes.Opened, BoxesUnopened: boxes.Unopened,
		},
		LatestRecipients: recipients,
	}, nil
}
