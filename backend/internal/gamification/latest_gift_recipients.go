package gamification

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// GiftRecipientsLimit is GIFT_RECIPIENTS_LIMIT: rows of the board's recent-gift list (A7).
const GiftRecipientsLimit = 10

// GiftRecipient is one row of "10 Sunner nhận quà mới nhất": a Sunner who
// opened a secret box ("gift" = opened box) and the icon of that latest box.
type GiftRecipient struct {
	UserID    uuid.UUID `json:"userId"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	Icon      *string   `json:"icon"`
}

// giftRecipientQuery is the sqlc query behind LatestGiftRecipients (*db.Queries).
type giftRecipientQuery interface {
	ListLatestGiftRecipients(ctx context.Context, rowLimit int32) ([]db.ListLatestGiftRecipientsRow, error)
}

// LatestGiftRecipients is SecretBoxService.LatestRecipients (F008 A7, FR-407):
// distinct Sunners by their most recent open, newest first. Only who opened a
// box and which icon is read: nothing about kudos or senders (R02).
func LatestGiftRecipients(ctx context.Context, q giftRecipientQuery, limit int32) ([]GiftRecipient, error) {
	rows, err := q.ListLatestGiftRecipients(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("list latest gift recipients: %w", err)
	}
	recipients := make([]GiftRecipient, len(rows))
	for i, row := range rows {
		recipients[i] = GiftRecipient{UserID: row.ID, Name: row.Name, AvatarURL: row.AvatarUrl}
		if row.Icon != nil {
			icon := string(*row.Icon)
			recipients[i].Icon = &icon
		}
	}
	return recipients, nil
}
