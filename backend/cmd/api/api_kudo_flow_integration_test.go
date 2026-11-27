//go:build integration

package main

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

var opaqueKey = regexp.MustCompile(`^kudo-images/[0-9a-f-]{36}\.png$`)

// The thin risk path through the real router (phase 02): signed upload URL ->
// browser upload -> anonymous kudo with the image -> third-user read (masked)
// -> heart PUT/DELETE, with the F005/F006/F008 refusals on the way.
func TestKudoRiskPathThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	sender, senderToken := h.sunner(testkit.SunnerSpec{Name: "Path Sender"})
	receiver, _ := h.sunner(testkit.SunnerSpec{})
	_, thirdToken := h.sunner(testkit.SunnerSpec{})

	refusedUploads := []struct {
		body any
		want int
	}{
		{map[string]any{"contentType": "image/gif", "size": 10}, http.StatusUnprocessableEntity},
		{map[string]any{"contentType": "image/png", "size": 6 << 20}, http.StatusUnprocessableEntity},
		{"not an object", http.StatusBadRequest},
	}
	for _, tc := range refusedUploads {
		if got := h.do(http.MethodPost, "/api/v1/uploads/kudo-images", senderToken, tc.body); got.Status != tc.want {
			t.Errorf("upload URL for %v = %d %s, want %d", tc.body, got.Status, got.Body, tc.want)
		}
	}
	signed := h.do(http.MethodPost, "/api/v1/uploads/kudo-images", senderToken,
		map[string]any{"contentType": "image/png", "size": len(testkit.PNGBytes)})
	upload := signed.json(t)
	uploadID, _ := upload["uploadId"].(string)
	uploadURL, _ := upload["uploadUrl"].(string)
	if signed.Status != http.StatusCreated || uploadID == "" || uploadURL == "" || upload["token"] == nil {
		t.Fatalf("upload URL = %d %s", signed.Status, signed.Body)
	}
	var objectPath, owner, state string
	if err := h.db.Owner.QueryRow(context.Background(), `select object_path, owner_id::text, state::text
		from public.kudo_uploads where id = $1`, uploadID).Scan(&objectPath, &owner, &state); err != nil {
		t.Fatal(err)
	}
	testkit.DeleteObjectsAtCleanup(t, objectPath)
	if !opaqueKey.MatchString(objectPath) || strings.Contains(objectPath+uploadURL, sender.String()) ||
		owner != sender.String() || state != "pending" {
		t.Fatalf("upload row %s owner %s state %s (URL %s): key must be opaque (R01)", objectPath, owner, state, uploadURL)
	}
	if status := testkit.PutSignedUpload(t, uploadURL, "image/png", testkit.PNGBytes); status != http.StatusOK {
		t.Fatalf("browser upload = %d", status)
	}

	invalid := h.do(http.MethodPost, "/api/v1/kudos", senderToken, map[string]any{"receiverId": receiver})
	if invalid.Status != http.StatusUnprocessableEntity || invalid.errorCode(t) != "validation_failed" ||
		!strings.Contains(string(invalid.Body), `"fields"`) {
		t.Fatalf("invalid kudo = %d %s", invalid.Status, invalid.Body)
	}
	created := h.do(http.MethodPost, "/api/v1/kudos", senderToken, map[string]any{
		"receiverId": receiver, "title": "Cảm ơn", "contentHtml": "<p>Thank you!</p>", "hashtags": []string{"thanks"},
		"imageUploadIds": []string{uploadID}, "isAnonymous": true, "senderId": uuid.NewString(),
	})
	kudoID, _ := created.json(t)["kudoId"].(string)
	if created.Status != http.StatusCreated || kudoID == "" {
		t.Fatalf("create = %d %s", created.Status, created.Body)
	}

	card := h.do(http.MethodGet, "/api/v1/kudos/"+kudoID, thirdToken, nil)
	if card.Status != http.StatusOK || strings.Contains(string(card.Body), sender.String()) ||
		strings.Contains(string(card.Body), "Path Sender") || card.json(t)["sender"] != nil {
		t.Fatalf("third-user card = %d %s", card.Status, card.Body)
	}
	if got := h.do(http.MethodGet, "/api/v1/kudos/not-a-uuid", thirdToken, nil); got.Status != http.StatusNotFound || got.errorCode(t) != "kudo_not_found" {
		t.Errorf("non-uuid kudo = %d %s", got.Status, got.Body)
	}

	heart := h.do(http.MethodPut, "/api/v1/kudos/"+kudoID+"/heart", thirdToken, nil)
	if heart.Status != http.StatusOK || heart.json(t)["viewerHearted"] != true || heart.json(t)["heartTotal"].(float64) < 1 {
		t.Fatalf("heart PUT = %d %s", heart.Status, heart.Body)
	}
	if got := h.do(http.MethodDelete, "/api/v1/kudos/"+kudoID+"/heart", thirdToken, nil); got.Status != http.StatusOK || got.json(t)["viewerHearted"] != false {
		t.Fatalf("heart DELETE = %d %s", got.Status, got.Body)
	}
	if got := h.do(http.MethodPut, "/api/v1/kudos/"+kudoID+"/heart", senderToken, nil); got.Status != http.StatusForbidden ||
		got.errorCode(t) != "cannot_heart_own_kudo" {
		t.Errorf("sender heart = %d %s", got.Status, got.Body)
	}
	if got := h.do(http.MethodPut, "/api/v1/kudos/"+uuid.NewString()+"/heart", thirdToken, nil); got.Status != http.StatusNotFound {
		t.Errorf("heart on a missing kudo = %d", got.Status)
	}
}
