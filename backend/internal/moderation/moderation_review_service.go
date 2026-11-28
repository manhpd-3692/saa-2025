package moderation

import (
	"context"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
)

// ReviewQueries are the sqlc reads of moderation.sql (*db.Queries).
type ReviewQueries interface {
	AdminCountKudos(ctx context.Context, arg db.AdminCountKudosParams) (int32, error)
	AdminListKudos(ctx context.Context, arg db.AdminListKudosParams) ([]db.AdminListKudosRow, error)
	AdminListKudoPeople(ctx context.Context, arg db.AdminListKudoPeopleParams) ([]db.AdminListKudoPeopleRow, error)
	AdminKudoPeopleByIDs(ctx context.Context, ids []uuid.UUID) ([]db.AdminKudoPeopleByIDsRow, error)
}

// ReviewPerson is a sender or receiver of the review table and an option of
// the Sender / Receiver filters (A2). It never carries an email.
type ReviewPerson struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	UnitCode  *string   `json:"unitCode"`
}

// ReviewKudo is one review row (FR-101). Sender is the real sender, marked by
// isAnonymous, for the admin viewer (BR-004); the moderation fields let the
// row's action send expectedVersion (Codex R13).
type ReviewKudo struct {
	ID          uuid.UUID     `json:"id"`
	CreatedAt   time.Time     `json:"createdAt"`
	Title       string        `json:"title"`
	Excerpt     string        `json:"excerpt"`
	IsAnonymous bool          `json:"isAnonymous"`
	Sender      *ReviewPerson `json:"sender"`
	Receiver    ReviewPerson  `json:"receiver"`
	Hashtags    []string      `json:"hashtags"`
	HeartTotal  int64         `json:"heartTotal"`
	KudoModeration
}

// AppliedFilters echoes what Go applied, so the page labels the chosen
// people and shows the range it really used (null when ignored, BR-005).
type AppliedFilters struct {
	Sender   *ReviewPerson  `json:"sender"`
	Receiver *ReviewPerson  `json:"receiver"`
	Status   *db.KudoStatus `json:"status"`
	From     *string        `json:"from"`
	To       *string        `json:"to"`
	Query    string         `json:"q"`
}

// ReviewPage is the A1 answer: one page, the match count, the page shown
// (clamped to the last one) and the applied filters.
type ReviewPage struct {
	Items    []ReviewKudo   `json:"items"`
	Total    int32          `json:"total"`
	Page     int32          `json:"page"`
	PageSize int32          `json:"pageSize"`
	Filters  AppliedFilters `json:"filters"`
}

// ReviewService is the read half of ModerationService (A1, A2).
type ReviewService struct {
	queries ReviewQueries
}

// NewReviewService wires the sqlc reads.
func NewReviewService(queries ReviewQueries) *ReviewService {
	return &ReviewService{queries: queries}
}

// List is ALG-002 for one admin viewer: newest first, 20 a page; a page past
// the last one shows the last page (edge case).
func (s *ReviewService) List(ctx context.Context, viewer kudo.Viewer, filter ReviewFilter, page int32) (ReviewPage, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	total, err := s.queries.AdminCountKudos(ctx, filter.countParams())
	if err != nil {
		return ReviewPage{}, fmt.Errorf("count review kudos: %w", err)
	}
	page = min(max(page, 1), max(1, (total+ReviewPageSize-1)/ReviewPageSize))
	rows, err := s.queries.AdminListKudos(ctx, filter.listParams(page))
	if err != nil {
		return ReviewPage{}, fmt.Errorf("list review kudos: %w", err)
	}
	applied, err := s.appliedFilters(ctx, filter)
	if err != nil {
		return ReviewPage{}, err
	}
	items := make([]ReviewKudo, len(rows))
	for i, r := range rows {
		items[i] = reviewKudo(r, viewer)
	}
	return ReviewPage{Items: items, Total: total, Page: page, PageSize: ReviewPageSize, Filters: applied}, nil
}

// People is A2 (BR-009): up to PEOPLE_OPTIONS_LIMIT people who sent
// (asSender) or received a kudo, by name, narrowed by q on name or email.
func (s *ReviewService) People(ctx context.Context, asSender bool, q string) ([]ReviewPerson, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	rows, err := s.queries.AdminListKudoPeople(ctx, db.AdminListKudoPeopleParams{
		AsSender: asSender, Pattern: pattern(cutQuery(q)), RowLimit: PeopleOptionsLimit,
	})
	if err != nil {
		return nil, fmt.Errorf("list kudo people: %w", err)
	}
	people := make([]ReviewPerson, len(rows))
	for i, r := range rows {
		people[i] = ReviewPerson{ID: r.ID, Name: r.Name, AvatarURL: r.AvatarUrl, UnitCode: r.UnitCode}
	}
	return people, nil
}

// appliedFilters names the people of the Sender / Receiver filters in one read.
func (s *ReviewService) appliedFilters(ctx context.Context, f ReviewFilter) (AppliedFilters, error) {
	applied := AppliedFilters{Status: f.Status, Query: f.Query}
	if f.Dates != nil {
		from, to := f.Dates.FromDay(), f.Dates.ToDay()
		applied.From, applied.To = &from, &to
	}
	var ids []uuid.UUID
	for _, id := range []*uuid.UUID{f.SenderID, f.ReceiverID} {
		if id != nil {
			ids = append(ids, *id)
		}
	}
	if len(ids) == 0 {
		return applied, nil
	}
	rows, err := s.queries.AdminKudoPeopleByIDs(ctx, ids)
	if err != nil {
		return AppliedFilters{}, fmt.Errorf("read filter people: %w", err)
	}
	for _, r := range rows {
		person := &ReviewPerson{ID: r.ID, Name: r.Name, AvatarURL: r.AvatarUrl, UnitCode: r.UnitCode}
		if f.SenderID != nil && *f.SenderID == r.ID {
			applied.Sender = person
		}
		if f.ReceiverID != nil && *f.ReceiverID == r.ID {
			applied.Receiver = person
		}
	}
	return applied, nil
}

// reviewKudo maps a row; the sender goes through the shared anonymity rule,
// which keeps it for the admin viewer and nulls it for anyone else (BR-004).
func reviewKudo(r db.AdminListKudosRow, viewer kudo.Viewer) ReviewKudo {
	item := ReviewKudo{
		ID: r.ID, CreatedAt: r.CreatedAt, Title: r.Title, Excerpt: excerpt(kudo.VisibleText(r.Content)),
		IsAnonymous: r.IsAnonymous, Hashtags: r.Hashtags, HeartTotal: r.HeartTotal,
		Receiver: ReviewPerson{ID: r.ReceiverID, Name: r.ReceiverName, AvatarURL: r.ReceiverAvatarUrl, UnitCode: r.ReceiverUnitCode},
		KudoModeration: KudoModeration{
			Status: r.Status, ModerationVersion: r.ModerationVersion, ModeratedBy: r.ModeratedBy, ModeratedAt: r.ModeratedAt,
		},
	}
	if item.Hashtags == nil {
		item.Hashtags = []string{}
	}
	if kudo.SenderShownTo(r.IsAnonymous, viewer) {
		item.Sender = &ReviewPerson{ID: r.SenderID, Name: r.SenderName, AvatarURL: r.SenderAvatarUrl, UnitCode: r.SenderUnitCode}
	}
	return item
}

// excerpt keeps the first ExcerptLength code points of the visible text and
// marks a cut with an ellipsis.
func excerpt(text string) string {
	if utf8.RuneCountInString(text) <= ExcerptLength {
		return text
	}
	return string([]rune(text)[:ExcerptLength]) + "…"
}
