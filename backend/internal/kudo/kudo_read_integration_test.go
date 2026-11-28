//go:build integration

package kudo_test

import (
	"context"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// insertKudoAt inserts a public kudo at a given time (removed with its people).
func insertKudoAt(t *testing.T, tdb *testkit.TestDatabase, sender, receiver uuid.UUID, at time.Time) uuid.UUID {
	t.Helper()
	return scalar[uuid.UUID](t, tdb, `insert into public.kudos (sender_id, receiver_id, title, content, created_at, updated_at)
		values ($1, $2, 'Board kudo', '<p>Cảm ơn!</p>', $3, $3) returning id`, sender, receiver, at)
}

type keyset struct {
	at time.Time
	id uuid.UUID
}

// newerFirst is the feed order: created_at desc, then id desc (ALG-001).
func newerFirst(a, b keyset) int {
	if c := b.at.Compare(a.at); c != 0 {
		return c
	}
	return strings.Compare(b.id.String(), a.id.String())
}

// F006 SC-003 (ALG-001, BR-005): paging the whole feed by keyset never repeats
// or skips a kudo — pairs share a timestamp (id breaks the tie) and a kudo that
// arrives after page 1 does not shift the started sequence. The last page
// answers nextCursor null.
func TestFeedKeysetPagingHasNoDuplicateOrGapWhenAKudoArrivesMidway(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := kudo.NewReadService(db.New(tdb.App), newStore(t))
	sender, receiver, viewer := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()

	// A year ahead, so these 25 head the feed whatever else the local database holds.
	base := time.Now().AddDate(1, 0, 0).Truncate(time.Second)
	want := make([]keyset, 25)
	for i := range want {
		at := base.Add(-time.Duration(i/2) * time.Minute) // two kudos per timestamp
		want[i] = keyset{at, insertKudoAt(t, tdb, sender, receiver, at)}
	}
	slices.SortFunc(want, newerFirst)

	var got []keyset
	seen := map[uuid.UUID]bool{}
	var arrival uuid.UUID
	var after *kudo.Cursor
	for page := 1; ; page++ {
		res, err := reads.List(ctx, kudo.Viewer{ID: viewer}, after, kudo.FeedPageSize)
		if err != nil {
			t.Fatal(err)
		}
		if page <= 2 && len(res.Items) != kudo.FeedPageSize {
			t.Fatalf("page %d has %d items, want %d", page, len(res.Items), kudo.FeedPageSize)
		}
		for _, card := range res.Items {
			if seen[card.ID] {
				t.Fatalf("page %d repeats kudo %s", page, card.ID)
			}
			if card.ID == arrival {
				t.Fatalf("page %d shows the kudo that arrived after page 1", page)
			}
			if card.Status != db.KudoStatusPublic {
				t.Fatalf("feed shows a %s kudo", card.Status)
			}
			seen[card.ID] = true
			got = append(got, keyset{card.CreatedAt, card.ID})
		}
		if page == 1 { // a new kudo arrives while the reader scrolls
			arrival = insertKudoAt(t, tdb, sender, receiver, base.Add(time.Hour))
		}
		if res.NextCursor == nil {
			break
		}
		cursor, err := kudo.DecodeCursor(*res.NextCursor)
		if err != nil {
			t.Fatal(err)
		}
		after = &cursor
	}
	if len(got) < len(want) || !slices.Equal(got[:len(want)], want) {
		t.Fatalf("feed head = %v, want %v", got[:min(len(got), len(want))], want)
	}
	if !slices.IsSortedFunc(got, newerFirst) {
		t.Fatal("the full feed is not newest first")
	}
}

// F006 SC-004, SC-009 (BR-003, G08, G12): Highlight ranks by the weighted
// heart total (not the number of hearts), newer first on ties, fills with
// zero-heart kudos, skips spam, and ranks inside the filtered set (hashtag AND
// the receiver's unit). Every card's heart.total is that same weighted total.
func TestHighlightRanksByWeightedHeartsInsideTheFilteredSet(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := kudo.NewReadService(db.New(tdb.App), newStore(t))
	ctx := context.Background()
	suffix := uuid.NewString()[:8]
	unit := scalar[uuid.UUID](t, tdb, `insert into public.units (name, code) values ($1, $1) returning id`, "P7 "+suffix)
	t.Cleanup(func() { _, _ = tdb.Owner.Exec(context.Background(), `delete from public.units where id = $1`, unit) })
	tag := scalar[uuid.UUID](t, tdb, `insert into public.hashtags (name) values ($1) returning id`, "p7highlight"+suffix)

	sender, outsider := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	inUnit := tdb.CreateSunner(t, testkit.SunnerSpec{})
	fans := []uuid.UUID{tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})}
	if _, err := tdb.Owner.Exec(ctx, `update public.users set unit_id = $1 where id = $2`, unit, inUnit); err != nil {
		t.Fatal(err)
	}
	now := time.Now().Truncate(time.Second)
	kudoAt := func(receiver uuid.UUID, minutesAgo int, tagged bool, weights ...int) uuid.UUID {
		id := insertKudoAt(t, tdb, sender, receiver, now.Add(-time.Duration(minutesAgo)*time.Minute))
		if tagged {
			if _, err := tdb.Owner.Exec(ctx, `insert into public.kudo_hashtags (kudo_id, hashtag_id) values ($1, $2)`, id, tag); err != nil {
				t.Fatal(err)
			}
		}
		for i, w := range weights {
			if _, err := tdb.Owner.Exec(ctx, `insert into public.hearts (kudo_id, user_id, weight) values ($1, $2, $3)`, id, fans[i], w); err != nil {
				t.Fatal(err)
			}
		}
		return id
	}
	oldZero := kudoAt(inUnit, 50, true)
	singleDouble := kudoAt(inUnit, 40, true, 2)  // one x2 heart = 2
	twoSingles := kudoAt(inUnit, 30, true, 1, 1) // two hearts = 2, newer: wins the tie
	newZero := kudoAt(inUnit, 20, true)
	outsideTriple := kudoAt(outsider, 10, true, 3) // one heart weighing 3 beats two hearts of 1
	untaggedTop := kudoAt(inUnit, 5, false, 2, 2)
	spam := kudoAt(inUnit, 1, true, 2, 2)
	if _, err := tdb.Owner.Exec(ctx, `update public.kudos set status = 'spam' where id = $1`, spam); err != nil {
		t.Fatal(err)
	}

	otherUnit := scalar[uuid.UUID](t, tdb, `select id from public.units where id <> $1 order by code limit 1`, unit)
	wantTotals := map[uuid.UUID]int64{oldZero: 0, singleDouble: 2, twoSingles: 2, newZero: 0, outsideTriple: 3, untaggedTop: 4}
	for name, tc := range map[string]struct {
		filter kudo.HighlightFilter
		want   []uuid.UUID
	}{
		"hashtag":        {kudo.HighlightFilter{HashtagID: &tag}, []uuid.UUID{outsideTriple, twoSingles, singleDouble, newZero, oldZero}},
		"hashtag + unit": {kudo.HighlightFilter{HashtagID: &tag, UnitID: &unit}, []uuid.UUID{twoSingles, singleDouble, newZero, oldZero}},
		"unit":           {kudo.HighlightFilter{UnitID: &unit}, []uuid.UUID{untaggedTop, twoSingles, singleDouble, newZero, oldZero}},
		"no match":       {kudo.HighlightFilter{HashtagID: &tag, UnitID: &otherUnit}, []uuid.UUID{}},
	} {
		page, err := reads.Highlight(ctx, kudo.Viewer{ID: fans[0]}, tc.filter)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		got := make([]uuid.UUID, len(page.Items))
		for i, card := range page.Items {
			got[i] = card.ID
			if card.Heart.Total != wantTotals[card.ID] {
				t.Errorf("%s: kudo %s heart.total = %d, want weighted %d", name, card.ID, card.Heart.Total, wantTotals[card.ID])
			}
		}
		if !slices.Equal(got, tc.want) || page.NextCursor != nil {
			t.Errorf("%s: highlight = %v (next %v), want %v", name, got, page.NextCursor, tc.want)
		}
	}
}
