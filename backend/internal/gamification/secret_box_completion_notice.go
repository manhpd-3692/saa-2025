package gamification

import (
	"context"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
)

// completionNotice is the icons_completed notice of a Sunner (BR-010, FR-409),
// once ever per Sunner through its dedupe key (F009 N03).
func completionNotice(userID uuid.UUID) notification.CreateInput {
	return notification.CreateInput{
		RecipientID: userID,
		ActorID:     uuid.Nil, // the system completes the set; not a self-action (BR-003)
		Kind:        notification.KindIconsCompleted,
		DedupeKey:   "icons_completed:" + userID.String(),
	}
}

// storeCompletionNotice writes the notice inside the open's transaction, under
// a savepoint: it commits together with users.icons_completed_at, so nothing
// after the commit (a notifier failure, a timeout, a crash) can lose it (review
// W3). A failure here rolls back only the savepoint and is logged, so the open
// itself still commits (R23); the post-commit notifier call then retries it.
func storeCompletionNotice(ctx context.Context, tx pgx.Tx, userID uuid.UUID) {
	err := pgx.BeginFunc(ctx, tx, func(savepoint pgx.Tx) error {
		return notification.StoreInTx(ctx, db.New(savepoint), completionNotice(userID))
	})
	if err != nil {
		slog.WarnContext(ctx, "store icons_completed notice in the open transaction", "user_id", userID, "error", err)
	}
}
