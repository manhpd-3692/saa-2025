package notification

import (
	"encoding/base64"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ErrInvalidCursor is a list cursor the API did not issue (400).
var ErrInvalidCursor = errors.New("invalid notification cursor")

// cursorTag marks a notification cursor, so a kudo feed cursor is refused here.
const cursorTag = "n1"

// Cursor is the list keyset (A4): the (created_at, id) of the last row a page
// returned. Clients pass its opaque encoding back unchanged. It mirrors the kudo
// feed cursor; package kudo imports this package, so it cannot be shared.
type Cursor struct {
	CreatedAt time.Time
	ID        uuid.UUID
}

// Encode is the opaque base64url form of "n1|created_at|id". Postgres keeps
// microseconds, so RFC 3339 with nanoseconds round-trips the value exactly.
func (c Cursor) Encode() string {
	raw := cursorTag + "|" + c.CreatedAt.UTC().Format(time.RFC3339Nano) + "|" + c.ID.String()
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor parses Encode's output; anything else is ErrInvalidCursor.
func DecodeCursor(encoded string) (Cursor, error) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return Cursor{}, ErrInvalidCursor
	}
	parts := strings.Split(string(raw), "|")
	if len(parts) != 3 || parts[0] != cursorTag {
		return Cursor{}, ErrInvalidCursor
	}
	createdAt, err := time.Parse(time.RFC3339Nano, parts[1])
	if err != nil {
		return Cursor{}, ErrInvalidCursor
	}
	id, err := uuid.Parse(parts[2])
	if err != nil {
		return Cursor{}, ErrInvalidCursor
	}
	return Cursor{CreatedAt: createdAt, ID: id}, nil
}
