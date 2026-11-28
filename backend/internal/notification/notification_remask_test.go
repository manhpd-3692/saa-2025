package notification

import (
	"encoding/base64"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

func listRow(params string, kudoIsAnonymous *bool) db.ListNotificationsForRecipientRow {
	kudoID := uuid.New()
	return db.ListNotificationsForRecipientRow{
		ID: uuid.New(), Kind: string(KindKudoReceived), Params: []byte(params), KudoID: &kudoID,
		CreatedAt: time.Now(), KudoIsAnonymous: kudoIsAnonymous, KudoViewable: true,
	}
}

// BR-007 (Codex R02): the read layer drops every sender field of a notice whose
// kudo is anonymous NOW, for a non-admin viewer; other params stay.
func TestItemFromRowRemasksByCurrentAnonymity(t *testing.T) {
	yes, no := true, false
	stored := `{"senderId":"x","senderName":"Real Sender","senderAvatarUrl":"https://a.test/p.png","extra":1}`
	tests := map[string]struct {
		anonymous  *bool
		viewer     Viewer
		wantSender bool
	}{
		"anonymous kudo, Sunner": {&yes, Viewer{}, false},
		"anonymous kudo, admin":  {&yes, Viewer{IsAdmin: true}, true},
		"named kudo, Sunner":     {&no, Viewer{}, true},
		"kudo removed (no flag)": {nil, Viewer{}, true},
	}
	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			item, err := itemFromRow(listRow(stored, tc.anonymous), tc.viewer)
			if err != nil {
				t.Fatal(err)
			}
			for _, key := range senderParams {
				if _, ok := item.Params[key]; ok != tc.wantSender {
					t.Errorf("param %s present = %v, want %v", key, ok, tc.wantSender)
				}
			}
			if item.Params["extra"] != float64(1) {
				t.Errorf("non-sender param lost: %v", item.Params)
			}
		})
	}
}

// A row whose params cannot be decoded is an error, never a silently empty notice.
func TestItemFromRowRejectsBrokenParams(t *testing.T) {
	if _, err := itemFromRow(listRow(`not json`, nil), Viewer{}); err == nil {
		t.Fatal("broken params accepted")
	}
}

func TestCursorRoundTripAndRejectsForeignCursors(t *testing.T) {
	want := Cursor{CreatedAt: time.Date(2026, 11, 28, 10, 0, 0, 123456000, time.UTC), ID: uuid.New()}
	got, err := DecodeCursor(want.Encode())
	if err != nil || !got.CreatedAt.Equal(want.CreatedAt) || got.ID != want.ID {
		t.Fatalf("round trip = %+v, %v; want %+v", got, err, want)
	}
	feedCursor := base64.RawURLEncoding.EncodeToString([]byte(want.CreatedAt.Format(time.RFC3339Nano) + "|" + want.ID.String()))
	for _, bad := range []string{"", "%%%", feedCursor, base64.RawURLEncoding.EncodeToString([]byte("n1|yesterday|" + want.ID.String()))} {
		if _, err := DecodeCursor(bad); err != ErrInvalidCursor {
			t.Errorf("DecodeCursor(%q) = %v, want ErrInvalidCursor", bad, err)
		}
	}
}

func TestPageLimitClamps(t *testing.T) {
	for raw, want := range map[string]int{"": PageSize, "abc": PageSize, "0": PageSize, "-3": PageSize, "7": 7, "50": 50, "51": MaxPageSize} {
		if got := pageLimit(raw); got != want {
			t.Errorf("pageLimit(%q) = %d, want %d", raw, got, want)
		}
	}
}
