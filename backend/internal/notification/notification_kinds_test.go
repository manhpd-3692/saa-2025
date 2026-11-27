package notification

import (
	"testing"

	"github.com/google/uuid"
)

// F009 FR-002 (Codex R14): exactly seven kinds.
func TestKindValid(t *testing.T) {
	valid := []Kind{KindKudoReceived, KindHeartReceived, KindSecretBoxReceived, KindHeroLevelUp,
		KindKudoSpamWarning, KindIconsCompleted, KindGeneric}
	for _, k := range valid {
		if !k.Valid() {
			t.Errorf("%q should be valid", k)
		}
	}
	for _, k := range []Kind{"review_requested", "spam_warning", "", "KUDO_RECEIVED"} {
		if k.Valid() {
			t.Errorf("%q should be rejected", k)
		}
	}
	if !KindHeroLevelUp.onceEver() || !KindIconsCompleted.onceEver() || KindHeartReceived.onceEver() {
		t.Error("only hero_level_up and icons_completed are once-ever (N03)")
	}
}

// Codex N04: from no tier to New has a null fromLevelKey.
func TestHeroLevelUpInputWithoutPreviousTier(t *testing.T) {
	in := HeroLevelUpInput(HeroTransition{ReceiverID: uuid.New(), ToTier: "New", SendersCount: 1})
	if in.Params["fromLevelKey"] != nil || in.Params["levelKey"] != "New" || in.Params["sendersCount"] != 1 {
		t.Fatalf("params = %v", in.Params)
	}
}

func TestStripSenderParams(t *testing.T) {
	params := map[string]any{ParamSenderID: "x", ParamSenderName: "n", ParamSenderAvatarURL: "a", "receiverName": "r"}
	stripSenderParams(params)
	if len(params) != 1 || params["receiverName"] != "r" {
		t.Fatalf("params after strip = %v", params)
	}
}
