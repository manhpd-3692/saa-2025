//go:build integration

package main

import (
	"encoding/json"
	"maps"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

var profileImageURL = regexp.MustCompile(`/object/sign/kudo-images/[0-9a-f-]{36}\.png\?token=`)

func sortedKeys(object map[string]any) []string { return slices.Sorted(maps.Keys(object)) }

// profileItems reads a {items, nextCursor} answer of the profile kudos list.
func profileItems(t *testing.T, got apiResponse) ([]map[string]any, any) {
	t.Helper()
	var page struct {
		Items      []map[string]any `json:"items"`
		NextCursor any              `json:"nextCursor"`
	}
	if got.Status != http.StatusOK {
		t.Fatalf("profile kudos = %d %s", got.Status, got.Body)
	}
	if err := json.Unmarshal(got.Body, &page); err != nil || page.Items == nil {
		t.Fatalf("profile kudos body %s: %v", got.Body, err)
	}
	return page.Items, page.NextCursor
}

func itemByID(items []map[string]any, id string) map[string]any {
	for _, item := range items {
		if item["id"] == id {
			return item
		}
	}
	return nil
}

// F007 A1–A3 through the assembled router. R's profile holds: S → R anonymous
// with an image, T → R named, S → R spam, R → T named and R → S anonymous.
// Third user T sees no trace of S in any field, URL or the raw body (SC-011,
// SC-004); R's anonymous send is out of T's sent list and count (SC-005); spam
// is nowhere (SC-006); a teammate gets no email and no box figures, the owner
// gets both box figures (SC-007, BR-004); an admin sees both anonymous senders
// (D010); lists carry exactly the KudoCard fields (SC-012).
func TestSunnerProfileThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	ownerEmail := testkit.UniqueEmail("profile.owner")
	owner, ownerToken := h.sunner(testkit.SunnerSpec{Email: ownerEmail, Name: "Profile Owner"})
	senderEmail := testkit.UniqueEmail("profile.hidden")
	sender, senderToken := h.sunner(testkit.SunnerSpec{Email: senderEmail, Name: "Profile Hidden Sender"})
	third, thirdToken := h.sunner(testkit.SunnerSpec{})
	_, adminToken := h.sunner(testkit.SunnerSpec{Admin: true})

	uploadID, _ := h.uploadImage(senderToken)
	created := h.do(http.MethodPost, "/api/v1/kudos", senderToken, map[string]any{
		"receiverId": owner, "title": "Anonymous thanks", "contentHtml": "<p>Thank you</p>", "hashtags": []string{"p9anon"},
		"imageUploadIds": []string{uploadID}, "isAnonymous": true,
	})
	anonReceived, _ := created.json(t)["kudoId"].(string)
	if created.Status != http.StatusCreated || anonReceived == "" {
		t.Fatalf("create anonymous kudo = %d %s", created.Status, created.Body)
	}
	namedReceived := h.db.CreateKudo(t, testkit.KudoSpec{Sender: third, Receiver: owner}).String()
	spam := h.db.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: owner, Spam: true}).String()
	namedSent := h.db.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: third}).String()
	anonSent := h.db.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: sender, Anonymous: true}).String()
	profilePath := "/api/v1/users/" + owner.String() + "/profile"
	kudosPath := func(filter string) string { return "/api/v1/users/" + owner.String() + "/kudos?filter=" + filter }

	// A2 as third user T: three counts only, no email, no box figures.
	asThird := h.do(http.MethodGet, profilePath, thirdToken, nil)
	profile := asThird.json(t)
	counts, _ := profile["counts"].(map[string]any)
	user, _ := profile["user"].(map[string]any)
	if asThird.Status != http.StatusOK || profile["isOwner"] != false || profile["countsUnavailable"] != false ||
		!slices.Equal(sortedKeys(profile), []string{"collectedIcons", "counts", "countsUnavailable", "isOwner", "user"}) ||
		!slices.Equal(sortedKeys(counts), []string{"heartsReceived", "kudosReceived", "kudosSent"}) ||
		!slices.Equal(sortedKeys(user), []string{"avatarUrl", "id", "name", "unitCode"}) ||
		counts["kudosReceived"] != float64(2) || counts["kudosSent"] != float64(1) || user["name"] != "Profile Owner" {
		t.Fatalf("teammate profile = %d %s", asThird.Status, asThird.Body)
	}
	if strings.Contains(string(asThird.Body), ownerEmail) || strings.Contains(string(asThird.Body), "email") {
		t.Errorf("teammate profile exposes an email: %s", asThird.Body)
	}

	received, next := profileItems(t, h.do(http.MethodGet, kudosPath("received"), thirdToken, nil))
	wantCard := []string{"contentHtml", "createdAt", "hashtags", "heart", "id", "images", "isAnonymous", "isOwn", "receiver", "sender", "status", "title"}
	if len(received) != 2 || next != nil || itemByID(received, spam) != nil || itemByID(received, namedReceived) == nil {
		t.Fatalf("T reads R received = %v (next %v), want the anonymous and the named kudo", received, next)
	}
	anon := itemByID(received, anonReceived)
	raw, _ := json.Marshal(anon)
	images, _ := anon["images"].([]any)
	if anon == nil || anon["sender"] != nil || anon["isOwn"] != false || len(images) != 1 || !slices.Equal(sortedKeys(anon), wantCard) {
		t.Fatalf("anonymous card for T = %s", raw)
	}
	imageURL, _ := images[0].(map[string]any)["url"].(string)
	if decoded, _ := url.QueryUnescape(imageURL); !profileImageURL.MatchString(imageURL) || strings.Contains(decoded, sender.String()) {
		t.Errorf("image URL %q is not an opaque signed key", imageURL)
	}
	whole := string(h.do(http.MethodGet, kudosPath("received"), thirdToken, nil).Body)
	for _, secret := range []string{sender.String(), "Profile Hidden Sender", senderEmail, strings.Split(senderEmail, "@")[0]} {
		if strings.Contains(whole, secret) {
			t.Errorf("received list for T contains %q (SC-011)", secret)
		}
	}

	sentForThird, _ := profileItems(t, h.do(http.MethodGet, kudosPath("sent"), thirdToken, nil))
	if len(sentForThird) != 1 || itemByID(sentForThird, namedSent) == nil {
		t.Errorf("T reads R sent = %v, want only the named send (BR-002)", sentForThird)
	}

	// A1 as the owner: both box figures, the anonymous send counted and listed but masked (D002).
	own := h.do(http.MethodGet, profilePath, ownerToken, nil).json(t)
	ownCounts, _ := own["counts"].(map[string]any)
	if own["isOwner"] != true || ownCounts["kudosSent"] != float64(2) || ownCounts["boxesOpened"] != float64(0) ||
		ownCounts["boxesUnopened"] != float64(0) || own["collectedIcons"] == nil {
		t.Errorf("own profile = %v", own)
	}
	ownSent, _ := profileItems(t, h.do(http.MethodGet, kudosPath("sent"), ownerToken, nil))
	if mine := itemByID(ownSent, anonSent); len(ownSent) != 2 || mine == nil || mine["sender"] != nil || mine["isOwn"] != true {
		t.Errorf("owner reads own sent = %v, want 2 with the anonymous one masked and isOwn", ownSent)
	}
	// The owner is a non-admin viewer of the anonymous kudo they received: no sender id, name or avatar (BR-001, review S4).
	ownReceivedRaw := h.do(http.MethodGet, kudosPath("received"), ownerToken, nil)
	ownReceived, _ := profileItems(t, ownReceivedRaw)
	if got := itemByID(ownReceived, anonReceived); got == nil || got["sender"] != nil || got["isOwn"] != false {
		t.Errorf("owner reads the anonymous kudo received = %v, want sender null and isOwn false", got)
	}
	for _, secret := range []string{sender.String(), "Profile Hidden Sender", senderEmail, strings.Split(senderEmail, "@")[0]} {
		if strings.Contains(string(ownReceivedRaw.Body), secret) {
			t.Errorf("owner's received list contains %q", secret)
		}
	}

	// An admin sees the real senders of both anonymous kudos (G04, D010).
	adminSent, _ := profileItems(t, h.do(http.MethodGet, kudosPath("sent"), adminToken, nil))
	adminReceived, _ := profileItems(t, h.do(http.MethodGet, kudosPath("received"), adminToken, nil))
	sentBy := func(item map[string]any) any {
		sender, _ := item["sender"].(map[string]any)
		return sender["id"]
	}
	if s := itemByID(adminSent, anonSent); len(adminSent) != 2 || s == nil || sentBy(s) != owner.String() {
		t.Errorf("admin reads R sent = %v", adminSent)
	}
	if r := itemByID(adminReceived, anonReceived); r == nil || sentBy(r) != sender.String() {
		t.Errorf("admin reads R received = %v", adminReceived)
	}
	if got, _ := h.do(http.MethodGet, profilePath, adminToken, nil).json(t)["counts"].(map[string]any); got["kudosSent"] != float64(2) ||
		got["boxesOpened"] != nil {
		t.Errorf("admin counts = %v, want sent 2 and no box figures (not the owner)", got)
	}
}

// F007 A1–A3 refusals: no token → 401 (SC-010); a non-uuid or unknown id →
// 404 user_not_found on both endpoints (FR-104); a missing or unknown filter
// and a malformed cursor or one issued for the other filter → 400.
func TestSunnerProfileRefusalsThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	owner, token := h.sunner(testkit.SunnerSpec{})
	other, _ := h.sunner(testkit.SunnerSpec{})
	for range 11 {
		h.db.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: other})
		h.db.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: owner})
	}
	base := "/api/v1/users/" + owner.String()

	for _, path := range []string{base + "/profile", base + "/kudos?filter=received"} {
		if got := h.do(http.MethodGet, path, "", nil); got.Status != http.StatusUnauthorized {
			t.Errorf("GET %s without a token = %d, want 401", path, got.Status)
		}
	}
	for _, id := range []string{"not-a-uuid", uuid.NewString()} {
		for _, path := range []string{"/api/v1/users/" + id + "/profile", "/api/v1/users/" + id + "/kudos?filter=sent"} {
			if got := h.do(http.MethodGet, path, token, nil); got.Status != http.StatusNotFound || got.errorCode(t) != "user_not_found" {
				t.Errorf("GET %s = %d %s, want 404 user_not_found", path, got.Status, got.Body)
			}
		}
	}
	for _, query := range []string{"", "?filter=all", "?filter=RECEIVED"} {
		if got := h.do(http.MethodGet, base+"/kudos"+query, token, nil); got.Status != http.StatusBadRequest || got.errorCode(t) != "invalid_filter" {
			t.Errorf("GET kudos%s = %d %s, want 400 invalid_filter", query, got.Status, got.Body)
		}
	}
	_, receivedCursor := profileItems(t, h.do(http.MethodGet, base+"/kudos?filter=received", token, nil))
	cursor, _ := receivedCursor.(string)
	if cursor == "" {
		t.Fatal("11 received kudos must give a next cursor")
	}
	for _, path := range []string{base + "/kudos?filter=sent&cursor=" + cursor, base + "/kudos?filter=received&cursor=%25%25", base + "/kudos?filter=received&cursor=bm9wZQ"} {
		if got := h.do(http.MethodGet, path, token, nil); got.Status != http.StatusBadRequest || got.errorCode(t) != "invalid_cursor" {
			t.Errorf("GET %s = %d %s, want 400 invalid_cursor", path, got.Status, got.Body)
		}
	}
	if rest, next := profileItems(t, h.do(http.MethodGet, base+"/kudos?filter=received&cursor="+cursor, token, nil)); len(rest) != 1 || next != nil {
		t.Errorf("second received page = %d items (next %v), want 1 and null", len(rest), next)
	}
}
