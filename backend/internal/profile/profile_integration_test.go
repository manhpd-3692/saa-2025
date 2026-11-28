//go:build integration

package profile_test

import (
	"context"
	"errors"
	"slices"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/profile"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// newService reads through the API role; no fixture here has images, so the
// Storage client is never asked to sign anything.
func newService(queries profile.Queries, tdb *testkit.TestDatabase) *profile.Service {
	return profile.NewService(queries, kudo.NewReadService(db.New(tdb.App), upload.UnavailableObjectStore{}))
}

func exec(t *testing.T, tdb *testkit.TestDatabase, sql string, args ...any) {
	t.Helper()
	if _, err := tdb.Owner.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
}

func counts(t *testing.T, svc *profile.Service, viewer kudo.Viewer, owner uuid.UUID) profile.Counts {
	t.Helper()
	p, err := svc.Get(context.Background(), viewer, owner)
	if err != nil || p.Counts == nil {
		t.Fatalf("profile of %s = %+v, %v", owner, p, err)
	}
	return *p.Counts
}

// SC-001: a Sunner with no activity gets zeros, an empty (not null) icon list
// and, as the owner, both box figures at 0; SC-008's data side: one unopened
// box is reported as 1 (the button enables on it).
func TestNewSunnerProfileShowsZeros(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := newService(db.New(tdb.App), tdb)
	owner := tdb.CreateSunner(t, testkit.SunnerSpec{Name: "Brand New Sunner"})
	p, err := svc.Get(context.Background(), kudo.Viewer{ID: owner}, owner)
	if err != nil || !p.IsOwner || p.CountsUnavailable || p.User.Name != "Brand New Sunner" || p.User.UnitCode != nil ||
		p.CollectedIcons == nil || len(p.CollectedIcons) != 0 {
		t.Fatalf("new Sunner profile = %+v, %v", p, err)
	}
	if c := *p.Counts; c.KudosReceived != 0 || c.KudosSent != 0 || c.HeartsReceived != 0 || *c.BoxesOpened != 0 || *c.BoxesUnopened != 0 {
		t.Fatalf("new Sunner counts = %+v", c)
	}
	exec(t, tdb, `insert into public.secret_boxes (user_id, seq) values ($1, 1)`, owner)
	if c := counts(t, svc, kudo.Viewer{ID: owner}, owner); *c.BoxesUnopened != 1 {
		t.Fatalf("unopened after one box = %d, want 1", *c.BoxesUnopened)
	}
}

// SC-002: the sent list is the owner's kudos only, newest first, 10 per page,
// and the last page answers nextCursor null without repeating a card.
func TestProfileSentListPagesNewestFirst(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := newService(db.New(tdb.App), tdb)
	owner, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	var want []uuid.UUID
	for i := range 12 {
		id := tdb.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: other})
		exec(t, tdb, `update public.kudos set created_at = now() - make_interval(mins => $2) where id = $1`, id, 100-i)
		want = append([]uuid.UUID{id}, want...)
	}
	tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: owner}) // received, never in "sent"
	viewer := kudo.Viewer{ID: other}
	first, err := svc.ListKudos(context.Background(), viewer, owner, profile.FilterSent, "")
	if err != nil || len(first.Items) != profile.PageSize || first.NextCursor == nil {
		t.Fatalf("first sent page = %d items, next %v, %v", len(first.Items), first.NextCursor, err)
	}
	second, err := svc.ListKudos(context.Background(), viewer, owner, profile.FilterSent, *first.NextCursor)
	if err != nil || len(second.Items) != 2 || second.NextCursor != nil {
		t.Fatalf("second sent page = %d items, next %v, %v", len(second.Items), second.NextCursor, err)
	}
	var got []uuid.UUID
	for _, card := range append(first.Items, second.Items...) {
		if card.Sender == nil || card.Sender.ID != owner {
			t.Errorf("sent card %s has sender %+v, want the owner", card.ID, card.Sender)
		}
		got = append(got, card.ID)
	}
	if !slices.Equal(got, want) {
		t.Fatalf("sent order = %v, want newest first %v", got, want)
	}
	if _, err := svc.ListKudos(context.Background(), viewer, owner, profile.FilterReceived, *first.NextCursor); !errors.Is(err, profile.ErrInvalidCursor) {
		t.Fatalf("sent cursor on the received list: %v, want ErrInvalidCursor", err)
	}
}

// SC-009 and SC-006: hearts received is the weighted total over the owner's
// public received kudos (a x2 heart counts 2; hearts on their sent kudos do
// not count); a kudo turned spam leaves the list and every count, for the
// owner too (D007).
func TestProfileCountsUseWeightedHeartsAndDropSpam(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := newService(db.New(tdb.App), tdb)
	owner, other, fan := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	received := tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: owner})
	sent := tdb.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: other})
	asOwner := kudo.Viewer{ID: owner}
	before := counts(t, svc, asOwner, owner)
	exec(t, tdb, `insert into public.hearts (kudo_id, user_id, weight) values ($1, $2, 2), ($3, $2, 1)`, received, fan, sent)
	if after := counts(t, svc, asOwner, owner); after.HeartsReceived != before.HeartsReceived+2 || after.KudosReceived != 1 || after.KudosSent != 1 {
		t.Fatalf("after a x2 heart: %+v (before %+v), want hearts +2", after, before)
	}

	exec(t, tdb, `update public.kudos set status = 'spam' where id in ($1, $2)`, received, sent)
	for _, viewer := range []kudo.Viewer{asOwner, {ID: fan}, {ID: fan, IsAdmin: true}} {
		if c := counts(t, svc, viewer, owner); c.KudosReceived != 0 || c.KudosSent != 0 || c.HeartsReceived != 0 {
			t.Errorf("viewer %+v counts after spam = %+v, want zeros", viewer, c)
		}
		for _, filter := range []profile.Filter{profile.FilterReceived, profile.FilterSent} {
			if page, err := svc.ListKudos(context.Background(), viewer, owner, filter, ""); err != nil || len(page.Items) != 0 {
				t.Errorf("viewer %+v %s list after spam = %d items, %v", viewer, filter, len(page.Items), err)
			}
		}
	}
	if _, err := svc.Get(context.Background(), asOwner, uuid.New()); !errors.Is(err, profile.ErrUserNotFound) {
		t.Errorf("unknown id: %v, want ErrUserNotFound", err)
	}
}

// failingQueries forces one failure of the profile reads (SC-012).
type failingQueries struct {
	*db.Queries
	summary, counts bool
}

func (f failingQueries) CountSecretBoxes(ctx context.Context, userID uuid.UUID) (db.CountSecretBoxesRow, error) {
	if f.summary {
		return db.CountSecretBoxesRow{}, errors.New("forced summary failure")
	}
	return f.Queries.CountSecretBoxes(ctx, userID)
}

func (f failingQueries) GetProfileKudoCounts(ctx context.Context, arg db.GetProfileKudoCountsParams) (db.GetProfileKudoCountsRow, error) {
	if f.counts {
		return db.GetProfileKudoCountsRow{}, errors.New("forced counts failure")
	}
	return f.Queries.GetProfileKudoCounts(ctx, arg)
}

// SC-012 (Codex R15, C02): a failed F008 summary answers counts null,
// countsUnavailable and collectedIcons null; failed count queries answer
// counts null with the icons kept. The header and the list still work.
func TestProfileSurvivesSummaryAndCountFailures(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	owner, other := tdb.CreateSunner(t, testkit.SunnerSpec{Name: "Degraded Owner"}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	tdb.CreateKudo(t, testkit.KudoSpec{Sender: other, Receiver: owner})
	exec(t, tdb, `insert into public.secret_boxes (user_id, seq, opened_at, icon) values ($1, 1, now(), 'REVIVAL')`, owner)
	ctx, asOwner := context.Background(), kudo.Viewer{ID: owner}

	noSummary := newService(failingQueries{Queries: db.New(tdb.App), summary: true}, tdb)
	p, err := noSummary.Get(ctx, asOwner, owner)
	if err != nil || p.User.Name != "Degraded Owner" || p.Counts != nil || !p.CountsUnavailable || p.CollectedIcons != nil {
		t.Fatalf("profile with a failed summary = %+v, %v", p, err)
	}
	if page, err := noSummary.ListKudos(ctx, asOwner, owner, profile.FilterReceived, ""); err != nil || len(page.Items) != 1 {
		t.Fatalf("list with a failed summary = %+v, %v", page, err)
	}

	noCounts := newService(failingQueries{Queries: db.New(tdb.App), counts: true}, tdb)
	p, err = noCounts.Get(ctx, asOwner, owner)
	if err != nil || p.Counts != nil || !p.CountsUnavailable || !slices.Equal(p.CollectedIcons, []db.SecretBoxIcon{db.SecretBoxIconREVIVAL}) {
		t.Fatalf("profile with failed counts = %+v, %v", p, err)
	}
}
