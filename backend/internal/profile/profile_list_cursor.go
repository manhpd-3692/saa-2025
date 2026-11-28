package profile

import (
	"encoding/base64"
	"errors"
	"strings"

	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
)

// ErrInvalidCursor is a cursor the API did not issue for this filter (400).
var ErrInvalidCursor = errors.New("invalid profile cursor")

// Filter picks the received or the sent list (FR-205).
type Filter string

const (
	FilterReceived Filter = "received"
	FilterSent     Filter = "sent"
)

// ParseFilter accepts exactly "received" or "sent" (A3 answers 400 otherwise).
func ParseFilter(raw string) (Filter, bool) {
	switch f := Filter(raw); f {
	case FilterReceived, FilterSent:
		return f, true
	}
	return "", false
}

// encodeCursor is the opaque next-page cursor: the kudo keyset of the last
// row (created_at, id), tagged with its filter so a cursor of the received
// list is refused on the sent list (technical-spec § 3.4).
func encodeCursor(filter Filter, last kudo.Cursor) string {
	return base64.RawURLEncoding.EncodeToString([]byte(string(filter) + ":" + last.Encode()))
}

// decodeCursor parses encodeCursor's output for the same filter.
func decodeCursor(filter Filter, encoded string) (kudo.Cursor, error) {
	raw, err := base64.RawURLEncoding.DecodeString(encoded)
	if err != nil {
		return kudo.Cursor{}, ErrInvalidCursor
	}
	tag, keyset, ok := strings.Cut(string(raw), ":")
	if !ok || tag != string(filter) {
		return kudo.Cursor{}, ErrInvalidCursor
	}
	cursor, err := kudo.DecodeCursor(keyset)
	if err != nil {
		return kudo.Cursor{}, ErrInvalidCursor
	}
	return cursor, nil
}
