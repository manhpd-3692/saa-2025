package kudo

import (
	"encoding/base64"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

// ALG-001: the cursor round-trips the exact keyset (microseconds, UTC), and a
// cursor we did not issue is rejected so the handler can answer 400.
func TestKeysetCursorRoundTripAndRejectsForeignInput(t *testing.T) {
	want := Cursor{CreatedAt: time.Date(2026, 11, 28, 10, 0, 0, 123456000, time.FixedZone("ICT", 7*3600)), ID: uuid.New()}
	got, err := DecodeCursor(want.Encode())
	if err != nil || !got.CreatedAt.Equal(want.CreatedAt) || got.ID != want.ID {
		t.Fatalf("DecodeCursor(Encode()) = %+v, %v; want %+v", got, err, want)
	}

	b64 := func(s string) string { return base64.RawURLEncoding.EncodeToString([]byte(s)) }
	for name, bad := range map[string]string{
		"not base64":   "%%%",
		"no separator": b64("2026-11-28T10:00:00Z"),
		"bad time":     b64("yesterday|" + uuid.NewString()),
		"bad id":       b64("2026-11-28T10:00:00Z|42"),
		"empty":        "",
	} {
		if _, err := DecodeCursor(bad); !errors.Is(err, ErrInvalidCursor) {
			t.Errorf("%s: DecodeCursor(%q) err = %v, want ErrInvalidCursor", name, bad, err)
		}
	}
}
