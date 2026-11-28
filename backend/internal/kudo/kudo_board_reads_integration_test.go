//go:build integration

package kudo_test

import (
	"context"
	"encoding/json"
	"errors"
	"maps"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// findInFeed pages the feed until the kudo shows (it is among the newest).
func findInFeed(t *testing.T, reads *kudo.ReadService, viewer kudo.Viewer, id uuid.UUID) (kudo.KudoCard, bool) {
	t.Helper()
	var after *kudo.Cursor
	for {
		page, err := reads.List(context.Background(), viewer, after, kudo.FeedMaxPageSize)
		if err != nil {
			t.Fatal(err)
		}
		for _, card := range page.Items {
			if card.ID == id {
				return card, true
			}
		}
		if page.NextCursor == nil {
			return kudo.KudoCard{}, false
		}
		cursor, err := kudo.DecodeCursor(*page.NextCursor)
		if err != nil {
			t.Fatal(err)
		}
		after = &cursor
	}
}

// jsonKeys is the sorted key set of a JSON object.
func jsonKeys(t *testing.T, v any) []string {
	t.Helper()
	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	var object map[string]any
	if err := json.Unmarshal(raw, &object); err != nil {
		t.Fatal(err)
	}
	return slices.Sorted(maps.Keys(object))
}

// F006 SC-001, SC-002, SC-007 (Codex R01) and SC-008 (Codex R15): sender S
// sends an anonymous kudo with an image; third user T reads it through
// Highlight, the feed and the detail and finds no identifier of S in any field
// or image URL, while S sees isOwn and an admin sees the real sender. A spam
// kudo is absent for T from all three. Cards have exactly the § 4.2 shape.
func TestBoardReadsMaskAnonymousSendersAndHideSpamEverywhere(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := kudo.NewReadService(db.New(tdb.App), newStore(t))
	ctx := context.Background()
	senderEmail := testkit.UniqueEmail("board.hidden")
	sender := tdb.CreateSunner(t, testkit.SunnerSpec{Email: senderEmail, Name: "Board Hidden Sender"})
	receiver, third := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	png, _ := tdb.CreatePendingUpload(t, sender, upload.MimePNG, testkit.PNGBytes)
	tagName := "p7mask" + uuid.NewString()[:8]
	in := validInput(receiver)
	in.IsAnonymous, in.ImageUploadIDs, in.Hashtags = true, []uuid.UUID{png}, []string{tagName}
	anonymous, err := newCreateService(t, tdb, notification.NewService(tdb.App)).Create(ctx, sender, in)
	if err != nil {
		t.Fatal(err)
	}
	spam := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Spam: true})
	tag := scalar[uuid.UUID](t, tdb, `select id from public.hashtags where name = $1`, tagName)
	if _, err := tdb.Owner.Exec(ctx, `insert into public.kudo_hashtags (kudo_id, hashtag_id) values ($1, $2)`, spam, tag); err != nil {
		t.Fatal(err)
	}

	asThird := kudo.Viewer{ID: third}
	highlight, err := reads.Highlight(ctx, asThird, kudo.HighlightFilter{HashtagID: &tag})
	if err != nil || len(highlight.Items) != 1 || highlight.Items[0].ID != anonymous {
		t.Fatalf("highlight for #%s = %+v, %v; want only the public kudo", tagName, highlight.Items, err)
	}
	fromFeed, found := findInFeed(t, reads, asThird, anonymous)
	if !found {
		t.Fatal("the anonymous kudo is missing from the feed")
	}
	if _, spamFound := findInFeed(t, reads, asThird, spam); spamFound {
		t.Fatal("the spam kudo is in the feed")
	}
	detail, err := reads.Get(ctx, asThird, anonymous)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := reads.Get(ctx, asThird, spam); !errors.Is(err, kudo.ErrKudoNotFound) {
		t.Fatalf("third user reading spam: %v, want not found", err)
	}

	secrets := []string{sender.String(), "Board Hidden Sender", senderEmail, strings.Split(senderEmail, "@")[0]}
	wantCard := []string{"contentHtml", "createdAt", "hashtags", "heart", "id", "images", "isAnonymous", "isOwn", "receiver", "sender", "status", "title"}
	for source, card := range map[string]kudo.KudoCard{"highlight": highlight.Items[0], "feed": fromFeed, "detail": detail} {
		raw, _ := json.Marshal(card)
		for _, secret := range secrets {
			if strings.Contains(string(raw), secret) {
				t.Errorf("%s card for a third user contains %q: %s", source, secret, raw)
			}
		}
		if card.Sender != nil || card.IsOwn || !card.IsAnonymous || len(card.Images) != 1 || card.Images[0].URL == nil ||
			!opaqueImageURL.MatchString(*card.Images[0].URL) || card.Status != db.KudoStatusPublic {
			t.Errorf("%s card = %s", source, raw)
		}
		if keys := jsonKeys(t, card); !slices.Equal(keys, wantCard) {
			t.Errorf("%s card keys = %v, want %v", source, keys, wantCard)
		}
		person := []string{"avatarUrl", "heroTier", "id", "name", "unitCode"}
		if keys := jsonKeys(t, card.Receiver); !slices.Equal(keys, person) {
			t.Errorf("%s receiver keys = %v, want %v", source, keys, person)
		}
		if keys := jsonKeys(t, card.Heart); !slices.Equal(keys, []string{"total", "viewerCanHeart", "viewerHearted"}) {
			t.Errorf("%s heart keys = %v", source, keys)
		}
	}

	own, err := reads.Highlight(ctx, kudo.Viewer{ID: sender}, kudo.HighlightFilter{HashtagID: &tag})
	if err != nil || len(own.Items) != 1 || own.Items[0].Sender != nil || !own.Items[0].IsOwn || own.Items[0].Heart.ViewerCanHeart {
		t.Fatalf("sender's own highlight = %+v, %v; want masked, isOwn, cannot heart", own.Items, err)
	}
	asAdmin, found := findInFeed(t, reads, kudo.Viewer{ID: admin, IsAdmin: true}, anonymous)
	if !found || asAdmin.Sender == nil || asAdmin.Sender.ID != sender || !asAdmin.IsAnonymous {
		t.Fatalf("admin feed card = %+v; want the real sender with the anonymous marker", asAdmin)
	}
}

// F006 A4, A6 (FR-205, FR-208, FR-210, BR-001, X07): Spotlight counts only
// public kudos per receiver; the sidebar reports the viewer's own public
// received/sent (anonymous sent included) and weighted hearts, never spam.
func TestSpotlightAndSidebarCountPublicKudosOnly(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	board := kudo.NewBoardReadService(db.New(tdb.App))
	ctx := context.Background()
	viewer, other, fan := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	received := tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: viewer})
	tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: viewer, Anonymous: true})
	spamReceived := tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: viewer, Spam: true})
	tdb.CreateKudo(t, testkit.KudoSpec{Sender: viewer, Receiver: other, Anonymous: true})
	for kudoID, weight := range map[uuid.UUID]int{received: 3, spamReceived: 5} {
		if _, err := tdb.Owner.Exec(ctx, `insert into public.hearts (kudo_id, user_id, weight) values ($1, $2, $3)`, kudoID, fan, weight); err != nil {
			t.Fatal(err)
		}
	}

	sidebar, err := board.Sidebar(ctx, kudo.Viewer{ID: viewer})
	if err != nil {
		t.Fatal(err)
	}
	want := kudo.ViewerStats{KudosReceived: 2, KudosSent: 1, HeartsReceived: 3}
	if sidebar.Stats != want || sidebar.LatestRecipients == nil || len(sidebar.LatestRecipients) > kudo.SidebarRecipients {
		t.Fatalf("sidebar = %+v, want stats %+v and at most %d recipients", sidebar, want, kudo.SidebarRecipients)
	}

	spotlight, err := board.Spotlight(ctx)
	if err != nil {
		t.Fatal(err)
	}
	publicTotal := scalar[int32](t, tdb, `select count(*)::int from public.kudos where status = 'public'`)
	if spotlight.Total > publicTotal+5 || spotlight.Total < publicTotal-5 { // other suites may write meanwhile
		t.Errorf("spotlight total = %d, public kudos now = %d", spotlight.Total, publicTotal)
	}
	idx := slices.IndexFunc(spotlight.Names, func(n kudo.SpotlightName) bool { return n.UserID == viewer })
	if idx < 0 || spotlight.Names[idx].Count != 2 {
		t.Fatalf("spotlight names = %+v; want the viewer with 2 public kudos received", spotlight.Names)
	}
	if !slices.IsSortedFunc(spotlight.Names, func(a, b kudo.SpotlightName) int { return int(b.Count - a.Count) }) ||
		len(spotlight.Recent) == 0 || len(spotlight.Recent) > kudo.SpotlightRecent {
		t.Fatalf("spotlight = %+v; want names by count desc and the latest receivers", spotlight)
	}
}
