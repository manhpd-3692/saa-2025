//go:build integration

package main

import (
	"context"
	"net/http"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F006 board endpoints through the assembled router: the list envelope and
// its 400 on a foreign cursor, the Highlight filter check, filter options
// (hashtags on public kudos only, units with codes), and SC-006: a non-uuid
// id, a missing id and another person's spam kudo answer the same 404.
func TestKudoBoardEndpointsThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	ctx := context.Background()
	sender, senderToken := h.sunner(testkit.SunnerSpec{})
	receiver, _ := h.sunner(testkit.SunnerSpec{})
	_, viewerToken := h.sunner(testkit.SunnerSpec{})
	public := h.db.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	spam := h.db.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Spam: true})
	suffix := uuid.NewString()[:8]
	for kudoID, tag := range map[uuid.UUID]string{public: "p7public" + suffix, spam: "p7spamonly" + suffix} {
		if _, err := h.db.Owner.Exec(ctx, `with t as (insert into public.hashtags (name) values ($2) returning id)
			insert into public.kudo_hashtags (kudo_id, hashtag_id) select $1, id from t`, kudoID, tag); err != nil {
			t.Fatal(err)
		}
	}

	feed := h.do(http.MethodGet, "/api/v1/kudos?limit=1", viewerToken, nil)
	body := feed.json(t)
	if items, _ := body["items"].([]any); feed.Status != http.StatusOK || len(items) != 1 || body["nextCursor"] == nil {
		t.Fatalf("feed page = %d %s", feed.Status, feed.Body)
	}
	next := h.do(http.MethodGet, "/api/v1/kudos?cursor="+body["nextCursor"].(string), viewerToken, nil)
	if next.Status != http.StatusOK {
		t.Fatalf("next page = %d %s", next.Status, next.Body)
	}
	for _, path := range []string{"/api/v1/kudos?cursor=bm90LWEtY3Vyc29y", "/api/v1/kudos?cursor=%25%25"} {
		if got := h.do(http.MethodGet, path, viewerToken, nil); got.Status != http.StatusBadRequest || got.errorCode(t) != "invalid_cursor" {
			t.Errorf("GET %s = %d %s, want 400 invalid_cursor", path, got.Status, got.Body)
		}
	}
	if got := h.do(http.MethodGet, "/api/v1/kudos/highlight?unitId=CECV2", viewerToken, nil); got.Status != http.StatusBadRequest ||
		got.errorCode(t) != "invalid_filter" {
		t.Errorf("highlight with a non-uuid unit = %d %s, want 400 invalid_filter", got.Status, got.Body)
	}
	highlight := h.do(http.MethodGet, "/api/v1/kudos/highlight", viewerToken, nil).json(t)
	if items, _ := highlight["items"].([]any); len(items) == 0 || len(items) > 5 || highlight["nextCursor"] != nil {
		t.Errorf("highlight = %v, want 1..5 items and nextCursor null", highlight)
	}

	options := h.do(http.MethodGet, "/api/v1/kudos/filter-options", viewerToken, nil)
	raw := string(options.Body)
	if options.Status != http.StatusOK || !strings.Contains(raw, `"p7public`+suffix+`"`) || strings.Contains(raw, "p7spamonly"+suffix) ||
		!strings.Contains(raw, `"code":"CECV1"`) {
		t.Errorf("filter options = %d %s; want the public hashtag, not the spam-only one, and unit codes", options.Status, raw)
	}
	for _, path := range []string{"/api/v1/kudos/spotlight", "/api/v1/kudos/sidebar"} {
		if got := h.do(http.MethodGet, path, viewerToken, nil); got.Status != http.StatusOK {
			t.Errorf("GET %s = %d %s", path, got.Status, got.Body)
		}
	}

	var notFound []string
	for _, id := range []string{"not-a-uuid", uuid.NewString(), spam.String()} {
		got := h.do(http.MethodGet, "/api/v1/kudos/"+id, viewerToken, nil)
		if got.Status != http.StatusNotFound {
			t.Errorf("GET /kudos/%s = %d %s, want 404", id, got.Status, got.Body)
		}
		notFound = append(notFound, string(got.Body))
	}
	if notFound[0] != notFound[1] || notFound[1] != notFound[2] {
		t.Errorf("not-found bodies differ, so ids can be probed: %q", notFound)
	}
	if got := h.do(http.MethodGet, "/api/v1/kudos/"+spam.String(), senderToken, nil); got.Status != http.StatusOK {
		t.Errorf("sender reading own spam = %d, want 200 (BR-006)", got.Status)
	}
}

// F006 A9 (FR-402, BR-002): the hover card's sent count skips the user's
// anonymous kudos for other Sunners but not for an admin or the user themself;
// it carries the unit code and name and the hero tier; unknown and non-uuid
// ids answer 404.
func TestUserHoverCardHidesAnonymousSendsFromOthers(t *testing.T) {
	h := newAPIHarness(t)
	ctx := context.Background()
	user, userToken := h.sunner(testkit.SunnerSpec{Name: "Hover Card Sunner"})
	other, otherToken := h.sunner(testkit.SunnerSpec{})
	_, adminToken := h.sunner(testkit.SunnerSpec{Admin: true})
	if _, err := h.db.Owner.Exec(ctx, `update public.users set unit_id = (select id from public.units where code = 'CECV2') where id = $1`, user); err != nil {
		t.Fatal(err)
	}
	h.db.CreateKudo(t, testkit.KudoSpec{Sender: user, Receiver: other})
	h.db.CreateKudo(t, testkit.KudoSpec{Sender: user, Receiver: other, Anonymous: true})
	h.db.CreateKudo(t, testkit.KudoSpec{Sender: user, Receiver: other, Spam: true})
	h.db.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: user})

	for name, tc := range map[string]struct {
		token    string
		wantSent float64
	}{"other Sunner": {otherToken, 1}, "admin": {adminToken, 2}, "the user": {userToken, 2}} {
		got := h.do(http.MethodGet, "/api/v1/users/"+user.String()+"/hover-card", tc.token, nil)
		card := got.json(t)
		if got.Status != http.StatusOK || card["name"] != "Hover Card Sunner" || card["unitCode"] != "CECV2" || card["unitName"] == nil ||
			card["receivedCount"] != float64(1) || card["sentCount"] != tc.wantSent || card["heroTier"] != "New" ||
			card["isSelf"] != (tc.token == userToken) {
			t.Errorf("%s: hover card = %d %s, want sent %v", name, got.Status, got.Body, tc.wantSent)
		}
	}
	for _, id := range []string{uuid.NewString(), "nope"} {
		if got := h.do(http.MethodGet, "/api/v1/users/"+id+"/hover-card", otherToken, nil); got.Status != http.StatusNotFound {
			t.Errorf("hover card %s = %d, want 404", id, got.Status)
		}
	}
}
