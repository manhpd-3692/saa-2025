package notification

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// Viewer is the caller of a read; IsAdmin comes from users.role (F002).
type Viewer struct {
	ID      uuid.UUID
	IsAdmin bool
}

// Item is one notice as A4 returns it. Text is not stored: the browser builds
// it from Kind + Params in the reader's language (FR-004). KudoAvailable says
// whether the linked kudo can still be opened by the caller (A5 action button).
type Item struct {
	ID            uuid.UUID      `json:"id"`
	Kind          Kind           `json:"kind"`
	Params        map[string]any `json:"params"`
	KudoID        *uuid.UUID     `json:"kudoId"`
	KudoAvailable bool           `json:"kudoAvailable"`
	ReadAt        *time.Time     `json:"readAt"`
	CreatedAt     time.Time      `json:"createdAt"`
}

// itemFromRow decodes a list row and re-masks it (BR-007, Codex R02): for a
// non-admin viewer every sender field is dropped when the linked kudo is
// anonymous NOW, whatever the stored params hold. This is the last guard after
// the insert-time strip (N01) and the edit-time redaction; it also hides a
// notice inserted while an anonymity edit was racing it.
func itemFromRow(row db.ListNotificationsForRecipientRow, viewer Viewer) (Item, error) {
	params := map[string]any{}
	if err := json.Unmarshal(row.Params, &params); err != nil {
		return Item{}, fmt.Errorf("decode params of notification %s: %w", row.ID, err)
	}
	if row.KudoIsAnonymous != nil && *row.KudoIsAnonymous && !viewer.IsAdmin {
		stripSenderParams(params)
	}
	return Item{
		ID:            row.ID,
		Kind:          Kind(row.Kind),
		Params:        params,
		KudoID:        row.KudoID,
		KudoAvailable: row.KudoViewable,
		ReadAt:        row.ReadAt,
		CreatedAt:     row.CreatedAt,
	}, nil
}
