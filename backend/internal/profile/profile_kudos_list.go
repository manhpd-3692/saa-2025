package profile

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
)

// ListKudos is A3: one page of the owner's received or sent public kudos,
// newest first, as F006 KudoCards in the {items, nextCursor} envelope (Codex
// R15). Every card is masked for the viewer by the shared card assembly
// (BR-001); the sent list follows BR-002 like the sent count.
func (s *Service) ListKudos(ctx context.Context, viewer kudo.Viewer, ownerID uuid.UUID, filter Filter, rawCursor string) (kudo.KudoPage, error) {
	var after *kudo.Cursor
	if rawCursor != "" {
		cursor, err := decodeCursor(filter, rawCursor)
		if err != nil {
			return kudo.KudoPage{}, err
		}
		after = &cursor
	}
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	exists, err := s.queries.ProfileUserExists(dbCtx, ownerID)
	switch {
	case err != nil:
		return kudo.KudoPage{}, fmt.Errorf("check profile user: %w", err)
	case !exists:
		return kudo.KudoPage{}, ErrUserNotFound
	}
	rows, err := s.listRows(dbCtx, viewer, ownerID, filter, after)
	if err != nil {
		return kudo.KudoPage{}, err
	}
	var next *string
	if len(rows) > PageSize {
		rows = rows[:PageSize]
		last := rows[PageSize-1]
		cursor := encodeCursor(filter, kudo.Cursor{CreatedAt: last.CreatedAt, ID: last.ID})
		next = &cursor
	}
	cards, err := s.cards.CardsFromRows(ctx, viewer, rows)
	if err != nil {
		return kudo.KudoPage{}, err
	}
	return kudo.KudoPage{Items: cards, NextCursor: next}, nil
}

// listRows reads PageSize+1 rows after the keyset, so a next page is known
// without counting (ALG-001), as GetKudoForRead rows for the card assembly.
func (s *Service) listRows(ctx context.Context, viewer kudo.Viewer, ownerID uuid.UUID, filter Filter, after *kudo.Cursor) ([]db.GetKudoForReadRow, error) {
	params := db.ListProfileKudosSentParams{
		ViewerID: viewer.ID, OwnerID: ownerID, IncludeAnonymousSent: includeAnonymousSent(viewer, ownerID), RowLimit: PageSize + 1,
	}
	if after != nil {
		params.CursorCreatedAt, params.CursorID = &after.CreatedAt, &after.ID
	}
	if filter == FilterSent {
		rows, err := s.queries.ListProfileKudosSent(ctx, params)
		if err != nil {
			return nil, fmt.Errorf("list sent kudos: %w", err)
		}
		return toCardRows(rows, func(r db.ListProfileKudosSentRow) db.GetKudoForReadRow { return db.GetKudoForReadRow(r) }), nil
	}
	rows, err := s.queries.ListProfileKudosReceived(ctx, db.ListProfileKudosReceivedParams{
		ViewerID: params.ViewerID, OwnerID: ownerID, CursorCreatedAt: params.CursorCreatedAt, CursorID: params.CursorID, RowLimit: params.RowLimit,
	})
	if err != nil {
		return nil, fmt.Errorf("list received kudos: %w", err)
	}
	return toCardRows(rows, func(r db.ListProfileKudosReceivedRow) db.GetKudoForReadRow { return db.GetKudoForReadRow(r) }), nil
}

// toCardRows converts list rows to the shared card row; the struct conversion
// stops compiling if a profile query's columns drift from GetKudoForRead.
func toCardRows[T any](rows []T, convert func(T) db.GetKudoForReadRow) []db.GetKudoForReadRow {
	out := make([]db.GetKudoForReadRow, len(rows))
	for i, row := range rows {
		out[i] = convert(row)
	}
	return out
}
