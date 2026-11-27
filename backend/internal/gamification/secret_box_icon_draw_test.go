package gamification

import (
	"bytes"
	"errors"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// ALG-003 (BR-008): byte b < 252 picks icon b % 6; 252..255 are rejected so the
// six icons keep exactly equal odds.
func TestDrawIconMapsBytesUniformly(t *testing.T) {
	cases := []struct {
		name  string
		bytes []byte
		want  db.SecretBoxIcon
	}{
		{"first icon", []byte{0}, db.SecretBoxIconREVIVAL},
		{"sixth icon", []byte{5}, db.SecretBoxIconROOTFURTHER},
		{"wraps by six", []byte{9}, db.SecretBoxIconFLOWTOHORIZON},
		{"last accepted byte", []byte{251}, db.SecretBoxIconROOTFURTHER},
		{"rejects 252..255 then draws again", []byte{252, 255, 1}, db.SecretBoxIconTOUCHOFLIGHT},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := drawIcon(bytes.NewReader(tc.bytes))
			if err != nil || got != tc.want {
				t.Fatalf("drawIcon = %q, %v; want %q", got, err, tc.want)
			}
		})
	}
}

func TestDrawIconReportsAnExhaustedSource(t *testing.T) {
	if _, err := drawIcon(bytes.NewReader(nil)); err == nil {
		t.Fatal("drawIcon on an empty source returned no error")
	}
	if _, err := drawIcon(errReader{}); err == nil {
		t.Fatal("drawIcon on a failing source returned no error")
	}
}

// Every icon is reachable and the enum order is the collection order.
func TestAllIconsAreTheSixEnumValuesInOrder(t *testing.T) {
	want := []db.SecretBoxIcon{
		db.SecretBoxIconREVIVAL, db.SecretBoxIconTOUCHOFLIGHT, db.SecretBoxIconSTAYGOLD,
		db.SecretBoxIconFLOWTOHORIZON, db.SecretBoxIconBEYONDTHEBOUNDARY, db.SecretBoxIconROOTFURTHER,
	}
	if len(allIcons) != IconCount || len(want) != IconCount {
		t.Fatalf("allIcons has %d entries, want %d", len(allIcons), IconCount)
	}
	for i, icon := range want {
		if allIcons[i] != icon || !icon.Valid() {
			t.Errorf("allIcons[%d] = %q, want %q", i, allIcons[i], icon)
		}
	}
}

func TestIconsAfterAddsTheDrawInEnumOrder(t *testing.T) {
	before := []db.SecretBoxIcon{db.SecretBoxIconSTAYGOLD, db.SecretBoxIconROOTFURTHER}
	got := iconsAfter(before, db.SecretBoxIconREVIVAL)
	want := []db.SecretBoxIcon{db.SecretBoxIconREVIVAL, db.SecretBoxIconSTAYGOLD, db.SecretBoxIconROOTFURTHER}
	if len(got) != len(want) {
		t.Fatalf("iconsAfter = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("iconsAfter = %v, want %v", got, want)
		}
	}
	if repeat := iconsAfter(want, db.SecretBoxIconSTAYGOLD); len(repeat) != 3 {
		t.Fatalf("a repeated icon changed the set: %v", repeat)
	}
}

type errReader struct{}

func (errReader) Read([]byte) (int, error) { return 0, errors.New("entropy source down") }
