//go:build integration

package main

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F011 SC-007 (safety-critical, BR-007, FR-601, Codex R05) on the assembled
// router: the review list, the people options and both decisions answer 401
// without a valid token and 403 to a user-role Sunner with no kudo data in the
// body, before anything is read or written.
func TestModerationReviewAuthorizationMatrix(t *testing.T) {
	h := newAPIHarness(t)
	author, _ := h.sunner(testkit.SunnerSpec{Name: "Matrix Hidden Author"})
	receiver, userToken := h.sunner(testkit.SunnerSpec{Name: "Matrix Receiver"})
	_, adminToken := h.sunner(testkit.SunnerSpec{Admin: true})
	kudoID := h.db.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver, Anonymous: true})

	type call struct{ method, path string }
	calls := []call{
		{http.MethodGet, "/api/v1/admin/kudos?receiver=" + receiver.String()},
		{http.MethodGet, "/api/v1/admin/kudos/people?role=sender&q=Matrix"},
		{http.MethodPost, "/api/v1/admin/kudos/" + kudoID.String() + "/spam"},
		{http.MethodPost, "/api/v1/admin/kudos/" + kudoID.String() + "/public"},
	}
	for _, c := range calls {
		var body any
		if c.method == http.MethodPost {
			body = map[string]int{"expectedVersion": 0}
		}
		for _, token := range []string{"", "not-a-jwt"} {
			if res := h.do(c.method, c.path, token, body); res.Status != http.StatusUnauthorized {
				t.Errorf("%s %s with token %q: %d %s, want 401", c.method, c.path, token, res.Status, res.Body)
			}
		}
		res := h.do(c.method, c.path, userToken, body)
		if res.Status != http.StatusForbidden || res.errorCode(t) != "forbidden" {
			t.Errorf("%s %s as a user: %d %s, want 403 forbidden", c.method, c.path, res.Status, res.Body)
		}
		if raw := string(res.Body); strings.Contains(raw, "Matrix Hidden Author") || strings.Contains(raw, kudoID.String()) {
			t.Errorf("%s %s as a user leaked data: %s", c.method, c.path, raw)
		}
	}
	if n := h.count(`select moderation_version from public.kudos where id = $1`, kudoID); n != 0 {
		t.Fatalf("refused decisions wrote: moderation_version = %d", n)
	}

	list := h.do(http.MethodGet, calls[0].path, adminToken, nil)
	items, _ := list.json(t)["items"].([]any)
	if list.Status != http.StatusOK || len(items) != 1 {
		t.Fatalf("list as an admin = %d %s", list.Status, list.Body)
	}
	people := h.do(http.MethodGet, calls[1].path, adminToken, nil)
	if people.Status != http.StatusOK || !strings.Contains(string(people.Body), "Matrix Hidden Author") ||
		strings.Contains(string(people.Body), "@sun-asterisk.com") {
		t.Fatalf("people as an admin = %d %s, want the sender without any email", people.Status, people.Body)
	}
}

// F011 SC-002 / BR-004 (G04) through the router: the admin row of an anonymous
// kudo carries the real sender and the marker, while the same kudo read by
// anyone else through F006 stays masked.
func TestReviewListShowsTheRealSenderOfAnonymousKudosToAdminsOnly(t *testing.T) {
	h := newAPIHarness(t)
	author, _ := h.sunner(testkit.SunnerSpec{Name: "Review Anonymous Author"})
	receiver, receiverToken := h.sunner(testkit.SunnerSpec{Name: "Review Receiver"})
	_, adminToken := h.sunner(testkit.SunnerSpec{Admin: true})
	kudoID := h.db.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver, Anonymous: true})

	list := h.do(http.MethodGet, "/api/v1/admin/kudos?receiver="+receiver.String(), adminToken, nil)
	body := list.json(t)
	items, _ := body["items"].([]any)
	if list.Status != http.StatusOK || len(items) != 1 || body["total"] != float64(1) || body["page"] != float64(1) {
		t.Fatalf("admin list = %d %s", list.Status, list.Body)
	}
	row, _ := items[0].(map[string]any)
	sender, _ := row["sender"].(map[string]any)
	if row["id"] != kudoID.String() || row["isAnonymous"] != true || sender["name"] != "Review Anonymous Author" ||
		row["excerpt"] != "Thank you" || row["status"] != "public" || row["moderationVersion"] != float64(0) {
		t.Fatalf("admin row = %v, want the real sender with the anonymous marker", row)
	}
	filters, _ := body["filters"].(map[string]any)
	if applied, _ := filters["receiver"].(map[string]any); applied["name"] != "Review Receiver" {
		t.Errorf("applied receiver filter = %v", filters)
	}

	detail := h.do(http.MethodGet, "/api/v1/kudos/"+kudoID.String(), receiverToken, nil)
	if detail.Status != http.StatusOK || detail.json(t)["sender"] != nil || strings.Contains(string(detail.Body), "Review Anonymous Author") {
		t.Fatalf("receiver detail = %d %s, want the sender masked", detail.Status, detail.Body)
	}
}

// Reviewer W1: a NUL byte or invalid UTF-8 in `q` is dropped like any other
// bad input (A1 Request), never a 500 on the list or the people options.
func TestReviewSearchToleratesNulAndInvalidUTF8(t *testing.T) {
	h := newAPIHarness(t)
	_, adminToken := h.sunner(testkit.SunnerSpec{Admin: true})
	for _, q := range []string{"%00", "%FF", "ph%00i%FE"} {
		for _, path := range []string{"/api/v1/admin/kudos?q=" + q, "/api/v1/admin/kudos/people?role=receiver&q=" + q} {
			if res := h.do(http.MethodGet, path, adminToken, nil); res.Status != http.StatusOK {
				t.Errorf("%s = %d %s, want 200", path, res.Status, res.Body)
			}
		}
	}
}

// F011 SC-003, SC-006, SC-008 (BR-006, BR-008, FR-304, FR-401) and Codex R13 on
// the router: Spam hides the kudo from teammates (detail 404, profile list and
// counts) while its author (the overlay audience: isOwn + spam) and admins still
// read it; the author is warned exactly once; Public restores every view and
// creates no notice of any kind.
func TestSpamThenPublicVisibilityNoticesAndOverlayAudience(t *testing.T) {
	h := newAPIHarness(t)
	author, authorToken := h.sunner(testkit.SunnerSpec{})
	receiver, _ := h.sunner(testkit.SunnerSpec{})
	_, thirdToken := h.sunner(testkit.SunnerSpec{})
	_, adminToken := h.sunner(testkit.SunnerSpec{Admin: true})
	kudoID := h.db.CreateKudo(t, testkit.KudoSpec{Sender: author, Receiver: receiver})
	detailPath := "/api/v1/kudos/" + kudoID.String()
	receivedPath := "/api/v1/users/" + receiver.String() + "/kudos?filter=received"
	profilePath := "/api/v1/users/" + receiver.String() + "/profile"
	decide := func(target string, version int) apiResponse {
		return h.do(http.MethodPost, "/api/v1/admin/kudos/"+kudoID.String()+"/"+target, adminToken, map[string]int{"expectedVersion": version})
	}
	const notices = `select count(*) from public.notifications where kudo_id = $1`
	const warnings = `select count(*) from public.notifications where recipient_id = $1 and kind = 'kudo_spam_warning'`

	if got := decide("spam", 0); got.Status != http.StatusOK || got.json(t)["changed"] != true {
		t.Fatalf("spam = %d %s", got.Status, got.Body)
	}
	if got := decide("spam", 0); got.Status != http.StatusConflict { // a second click with the old version
		t.Fatalf("double click = %d %s, want 409", got.Status, got.Body)
	}
	if n := h.count(warnings, author); n != 1 {
		t.Fatalf("spam warnings = %d, want exactly 1", n)
	}

	own := h.do(http.MethodGet, detailPath, authorToken, nil).json(t)
	asAdmin := h.do(http.MethodGet, detailPath, adminToken, nil).json(t)
	if own["status"] != "spam" || own["isOwn"] != true || asAdmin["status"] != "spam" || asAdmin["isOwn"] != false {
		t.Fatalf("author / admin detail of the spam kudo = %v / %v, want spam, isOwn only for the author", own, asAdmin)
	}
	if got := h.do(http.MethodGet, detailPath, thirdToken, nil); got.Status != http.StatusNotFound || got.errorCode(t) != "kudo_not_found" {
		t.Fatalf("teammate detail of a spam kudo = %d %s, want the uniform 404", got.Status, got.Body)
	}
	if items, _ := profileItems(t, h.do(http.MethodGet, receivedPath, thirdToken, nil)); itemByID(items, kudoID.String()) != nil {
		t.Fatalf("spam kudo still on the receiver's profile list")
	}
	if counts, _ := h.do(http.MethodGet, profilePath, thirdToken, nil).json(t)["counts"].(map[string]any); counts["kudosReceived"] != float64(0) {
		t.Fatalf("receiver counts with the kudo spam = %v, want 0 received", counts)
	}

	before := h.count(notices, kudoID)
	if got := decide("public", 1); got.Status != http.StatusOK || got.json(t)["changed"] != true {
		t.Fatalf("public = %d %s", got.Status, got.Body)
	}
	restored := h.do(http.MethodGet, detailPath, thirdToken, nil)
	if restored.Status != http.StatusOK || restored.json(t)["status"] != "public" {
		t.Fatalf("teammate detail after Public = %d %s", restored.Status, restored.Body)
	}
	if items, _ := profileItems(t, h.do(http.MethodGet, receivedPath, thirdToken, nil)); itemByID(items, kudoID.String()) == nil {
		t.Fatalf("restored kudo missing from the receiver's profile list")
	}
	if counts, _ := h.do(http.MethodGet, profilePath, thirdToken, nil).json(t)["counts"].(map[string]any); counts["kudosReceived"] != float64(1) {
		t.Fatalf("receiver counts after Public = %v, want 1 received", counts)
	}
	if after := h.count(notices, kudoID); after != before {
		t.Fatalf("notices on the kudo %d -> %d: Public must notify nobody", before, after)
	}
}

// count runs one integer query on the owner connection.
func (h *apiHarness) count(sql string, args ...any) int {
	h.t.Helper()
	var n int
	if err := h.db.Owner.QueryRow(context.Background(), sql, args...).Scan(&n); err != nil {
		h.t.Fatal(err)
	}
	return n
}
