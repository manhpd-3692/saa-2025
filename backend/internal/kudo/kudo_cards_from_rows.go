package kudo

import (
	"context"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// CardsFromRows builds KudoCards for rows another read domain selected with the
// GetKudoForRead column list (F007 profile lists, INT-002): the same hashtags,
// signed images, hero tiers, heart state and maskSender as the board, so no
// consumer assembles or masks a card itself (X05, Codex R15).
func (s *ReadService) CardsFromRows(ctx context.Context, viewer Viewer, rows []db.GetKudoForReadRow) ([]KudoCard, error) {
	page := make([]cardRow, len(rows))
	for i, row := range rows {
		page[i] = cardRow(row)
	}
	return s.buildCards(ctx, viewer, page)
}
