package kudo

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// redactNotificationSenders is BR-008 (Codex R02, N01): every notification
// linked to a kudo that is anonymous after this edit loses senderId,
// senderName and senderAvatarUrl, read or unread. It runs in the edit
// transaction while the kudo row is locked, so a kudo_received insert racing
// the edit (F009 takes FOR SHARE on the same row) either committed before and
// is redacted here, or waits and then stores no sender. Nothing ever re-adds
// the fields when anonymity is turned off again.
func redactNotificationSenders(ctx context.Context, q *db.Queries, kudoID uuid.UUID) error {
	if _, err := q.RedactKudoNotificationSenders(ctx, &kudoID); err != nil {
		return fmt.Errorf("redact notification senders: %w", err)
	}
	return nil
}
