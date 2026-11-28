package notification

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// List configuration (F009 § 4.6).
const (
	PageSize    = 20 // NOTIFICATIONS_PAGE_SIZE
	MaxPageSize = 50 // NOTIFICATIONS_PAGE_SIZE_MAX
)

// ErrNotFound covers a missing notification and another Sunner's (BR-001):
// both answer the same 404, so ids cannot be probed.
var ErrNotFound = errors.New("notification not found")

// Page is the A4 envelope: nextCursor is the opaque keyset of the last row,
// null on the last page.
type Page struct {
	Items      []Item  `json:"items"`
	NextCursor *string `json:"nextCursor"`
}

// ReadService serves the Sunner side of F009 (A2, A4, A6, A7). Every query is
// filtered by the verified caller id; the only write is read_at (FR-602).
type ReadService struct {
	queries *db.Queries
}

// NewReadService wires the pool queries.
func NewReadService(queries *db.Queries) *ReadService { return &ReadService{queries: queries} }

// List is A4: the caller's notices newest first, `limit` per page after the
// keyset `after` (nil = first page). It reads limit+1 rows to know whether a
// next page exists, and re-masks every row (BR-007).
func (s *ReadService) List(ctx context.Context, viewer Viewer, after *Cursor, limit int) (Page, error) {
	params := db.ListNotificationsForRecipientParams{
		RecipientID: viewer.ID, ViewerIsAdmin: viewer.IsAdmin, RowLimit: int32(limit + 1),
	}
	if after != nil {
		params.CursorCreatedAt, params.CursorID = &after.CreatedAt, &after.ID
	}
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	rows, err := s.queries.ListNotificationsForRecipient(dbCtx, params)
	if err != nil {
		return Page{}, fmt.Errorf("list notifications: %w", err)
	}
	page := Page{Items: make([]Item, 0, min(len(rows), limit))}
	for i, row := range rows {
		if i == limit {
			last := page.Items[limit-1]
			next := Cursor{CreatedAt: last.CreatedAt, ID: last.ID}.Encode()
			page.NextCursor = &next
			break
		}
		item, err := itemFromRow(row, viewer)
		if err != nil {
			return Page{}, err
		}
		page.Items = append(page.Items, item)
	}
	return page, nil
}

// UnreadCount is A2: the caller's unread notices (FR-205).
func (s *ReadService) UnreadCount(ctx context.Context, recipientID uuid.UUID) (int64, error) {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	n, err := s.queries.CountUnreadNotifications(dbCtx, recipientID)
	if err != nil {
		return 0, fmt.Errorf("count unread notifications: %w", err)
	}
	return n, nil
}

// MarkRead is A6: the caller's own notice becomes read, keeping its first read
// time (BR-005); an already read notice is a no-op success. Zero rows — a
// missing id or someone else's — is ErrNotFound (BR-001).
func (s *ReadService) MarkRead(ctx context.Context, recipientID, id uuid.UUID) error {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	n, err := s.queries.MarkNotificationRead(dbCtx, db.MarkNotificationReadParams{ID: id, RecipientID: recipientID})
	switch {
	case err != nil:
		return fmt.Errorf("mark notification read: %w", err)
	case n == 0:
		return ErrNotFound
	}
	return nil
}

// MarkAllRead is A7: every unread notice of the caller becomes read; read ones
// keep their read_at (BR-005). Returns how many changed; idempotent.
func (s *ReadService) MarkAllRead(ctx context.Context, recipientID uuid.UUID) (int64, error) {
	dbCtx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	n, err := s.queries.MarkAllNotificationsRead(dbCtx, recipientID)
	if err != nil {
		return 0, fmt.Errorf("mark all notifications read: %w", err)
	}
	return n, nil
}
