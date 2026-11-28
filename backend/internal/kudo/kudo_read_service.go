package kudo

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// ErrKudoNotFound covers a missing kudo and one the viewer may not see
// (BR-006): both answer the same 404, so ids cannot be probed.
var ErrKudoNotFound = errors.New("kudo not found")

// Board configuration (F006 § 4.6).
const (
	SignedURLTTL    = time.Hour // SIGNED_URL_TTL_SECONDS (INT-001)
	HighlightMax    = 5         // HIGHLIGHT_MAX (BR-003)
	FeedPageSize    = 10        // FEED_PAGE_SIZE (BR-005)
	FeedMaxPageSize = 50        // upper bound of the optional `limit`
)

// KudoPage is the list envelope (Codex R15): nextCursor is the opaque keyset
// of the last returned row, null on the last page and on Highlight.
type KudoPage struct {
	Items      []KudoCard `json:"items"`
	NextCursor *string    `json:"nextCursor"`
}

// HighlightFilter narrows Highlight; nil means "all" (FR-203, FR-204).
type HighlightFilter struct {
	HashtagID *uuid.UUID
	UnitID    *uuid.UUID // the receiver's unit (D004)
}

// ReadService is KudoReadService (F006 A0): every kudo read builds the KudoCard
// through maskSender, the weighted heart total and Go-signed image URLs.
type ReadService struct {
	queries *db.Queries
	store   upload.ObjectStore
}

// NewReadService wires the pool queries and the Storage client.
func NewReadService(queries *db.Queries, store upload.ObjectStore) *ReadService {
	return &ReadService{queries: queries, store: store}
}

// Get is F006 A7: one kudo as a KudoCard. A kudo is viewable when it is
// public, or the viewer is its sender or an admin (BR-006).
func (s *ReadService) Get(ctx context.Context, viewer Viewer, id uuid.UUID) (KudoCard, error) {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	row, err := s.queries.GetKudoForRead(dbCtx, db.GetKudoForReadParams{ViewerID: viewer.ID, ID: id})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return KudoCard{}, ErrKudoNotFound
	case err != nil:
		return KudoCard{}, fmt.Errorf("read kudo: %w", err)
	}
	if row.Status != db.KudoStatusPublic && row.SenderID != viewer.ID && !viewer.IsAdmin {
		return KudoCard{}, ErrKudoNotFound
	}
	cards, err := s.buildCards(ctx, viewer, []cardRow{cardRow(row)})
	if err != nil {
		return KudoCard{}, err
	}
	return cards[0], nil
}

// List is F006 A5: public kudos newest first, `limit` per page, after the
// keyset `after` (nil = first page). It reads limit+1 rows to know whether a
// next page exists, so the last page answers nextCursor null (ALG-001).
func (s *ReadService) List(ctx context.Context, viewer Viewer, after *Cursor, limit int) (KudoPage, error) {
	params := db.ListPublicKudoCardsParams{ViewerID: viewer.ID, RowLimit: int32(limit + 1)}
	if after != nil {
		params.CursorCreatedAt, params.CursorID = &after.CreatedAt, &after.ID
	}
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	rows, err := s.queries.ListPublicKudoCards(dbCtx, params)
	if err != nil {
		return KudoPage{}, fmt.Errorf("list kudos: %w", err)
	}
	var next *string
	if len(rows) > limit {
		rows = rows[:limit]
		last := rows[limit-1]
		cursor := Cursor{CreatedAt: last.CreatedAt, ID: last.ID}.Encode()
		next = &cursor
	}
	page := make([]cardRow, len(rows))
	for i, row := range rows {
		page[i] = cardRow(row)
	}
	cards, err := s.buildCards(ctx, viewer, page)
	if err != nil {
		return KudoPage{}, err
	}
	return KudoPage{Items: cards, NextCursor: next}, nil
}

// Highlight is F006 A2, the Kudos Quốc Dân top 5 (BR-003, G12): weighted
// hearts desc, newer first, zero-heart kudos included, ranked inside the
// filtered set. Not paged: nextCursor is always null.
func (s *ReadService) Highlight(ctx context.Context, viewer Viewer, filter HighlightFilter) (KudoPage, error) {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	rows, err := s.queries.ListHighlightKudoCards(dbCtx, db.ListHighlightKudoCardsParams{
		ViewerID: viewer.ID, HashtagID: filter.HashtagID, UnitID: filter.UnitID, RowLimit: HighlightMax,
	})
	if err != nil {
		return KudoPage{}, fmt.Errorf("list highlight kudos: %w", err)
	}
	ranked := make([]cardRow, len(rows))
	for i, row := range rows {
		ranked[i] = cardRow(row)
	}
	cards, err := s.buildCards(ctx, viewer, ranked)
	if err != nil {
		return KudoPage{}, err
	}
	return KudoPage{Items: cards}, nil
}
