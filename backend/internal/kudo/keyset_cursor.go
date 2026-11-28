package kudo

import (
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ErrInvalidCursor is a feed cursor the client did not get from us (400, ALG-001).
var ErrInvalidCursor = errors.New("invalid cursor")

// Cursor is the feed keyset: the (created_at, id) of the last row a page
// returned. Clients pass its opaque encoding back unchanged (Codex R15).
type Cursor struct {
	CreatedAt time.Time
	ID        uuid.UUID
}

// Encode is the opaque base64url form of "created_at|id". Postgres keeps
// microseconds, so RFC 3339 with nanoseconds round-trips the value exactly.
func (c Cursor) Encode() string {
	raw := c.CreatedAt.UTC().Format(time.RFC3339Nano) + "|" + c.ID.String()
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor parses Encode's output; anything else is ErrInvalidCursor.
func DecodeCursor(encoded string) (Cursor, error) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return Cursor{}, ErrInvalidCursor
	}
	stamp, id, ok := strings.Cut(string(raw), "|")
	if !ok {
		return Cursor{}, ErrInvalidCursor
	}
	createdAt, err := time.Parse(time.RFC3339Nano, stamp)
	if err != nil {
		return Cursor{}, ErrInvalidCursor
	}
	parsed, err := uuid.Parse(id)
	if err != nil {
		return Cursor{}, ErrInvalidCursor
	}
	return Cursor{CreatedAt: createdAt, ID: parsed}, nil
}
