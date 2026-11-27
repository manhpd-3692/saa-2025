//go:build integration

package main

import (
	"bytes"
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F008 SC-006, SC-013 (C04, R12, N12) through the router: the key is required,
// a replay returns the first body byte-for-byte, an empty inventory is 409.
func TestSecretBoxOpenThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	user, token := h.sunner(testkit.SunnerSpec{})
	for seq := 1; seq <= 2; seq++ {
		if _, err := h.db.Owner.Exec(context.Background(),
			`insert into public.secret_boxes (user_id, seq) values ($1, $2)`, user, seq); err != nil {
			t.Fatal(err)
		}
	}
	const open = "/api/v1/me/secret-boxes/open"
	for _, key := range []string{"", "not-a-uuid", uuid.Nil.String()} {
		got := h.do(http.MethodPost, open, token, nil, "Idempotency-Key", key)
		if got.Status != http.StatusBadRequest || got.errorCode(t) != "invalid_idempotency_key" {
			t.Errorf("open with key %q = %d %s", key, got.Status, got.Body)
		}
	}
	key := uuid.NewString()
	first := h.do(http.MethodPost, open, token, nil, "Idempotency-Key", key)
	replay := h.do(http.MethodPost, open, token, nil, "Idempotency-Key", key)
	if first.Status != http.StatusOK || replay.Status != http.StatusOK || !bytes.Equal(first.Body, replay.Body) {
		t.Fatalf("open %d %s / replay %d %s", first.Status, first.Body, replay.Status, replay.Body)
	}
	if got := h.do(http.MethodPost, open, token, nil, "Idempotency-Key", uuid.NewString()); got.Status != http.StatusOK {
		t.Fatalf("second box = %d %s", got.Status, got.Body)
	}
	if got := h.do(http.MethodPost, open, token, nil, "Idempotency-Key", uuid.NewString()); got.Status != http.StatusConflict ||
		got.errorCode(t) != "no_unopened_box" {
		t.Fatalf("open with none left = %d %s", got.Status, got.Body)
	}
}

// F011 SC-004, SC-007, SC-013 (R13, N08) through the router.
func TestModerationDecisionsThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	_, adminToken := h.sunner(testkit.SunnerSpec{Admin: true})
	author, _ := h.sunner(testkit.SunnerSpec{})
	receiver, userToken := h.sunner(testkit.SunnerSpec{})
	kudoID := h.db.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver})
	spam := "/api/v1/admin/kudos/" + kudoID.String() + "/spam"

	for _, body := range []any{map[string]any{}, map[string]any{"expectedVersion": -1}, map[string]any{"expectedVersion": "0"}} {
		if got := h.do(http.MethodPost, spam, adminToken, body); got.Status != http.StatusBadRequest {
			t.Errorf("decision with body %v = %d %s, want 400", body, got.Status, got.Body)
		}
	}
	if got := h.do(http.MethodPost, spam, userToken, map[string]int{"expectedVersion": 0}); got.Status != http.StatusForbidden {
		t.Errorf("decision as a user = %d, want 403 from RequireAdmin", got.Status)
	}
	changed := h.do(http.MethodPost, spam, adminToken, map[string]int{"expectedVersion": 0})
	if changed.Status != http.StatusOK || changed.json(t)["changed"] != true {
		t.Fatalf("spam = %d %s", changed.Status, changed.Body)
	}
	stale := h.do(http.MethodPost, spam, adminToken, map[string]int{"expectedVersion": 0})
	current, _ := stale.json(t)["current"].(map[string]any)
	if stale.Status != http.StatusConflict || stale.errorCode(t) != "stale_decision" || current["status"] != "spam" ||
		current["moderationVersion"] != float64(1) {
		t.Fatalf("double click = %d %s, want 409 stale_decision with the Spam row", stale.Status, stale.Body)
	}
	for _, path := range []string{"/api/v1/admin/kudos/" + uuid.NewString() + "/public", "/api/v1/admin/kudos/nope/spam"} {
		if got := h.do(http.MethodPost, path, adminToken, map[string]int{"expectedVersion": 0}); got.Status != http.StatusNotFound ||
			got.errorCode(t) != "kudo_not_found" {
			t.Errorf("%s = %d %s, want 404 kudo_not_found", path, got.Status, got.Body)
		}
	}
}
