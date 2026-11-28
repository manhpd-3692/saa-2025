//go:build integration

package moderation_test

import (
	"context"
	"errors"
	"net/url"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/moderation"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// Review fixtures are dated in March 2004 (report time zone, UTC+7) so no other
// suite's kudos fall in their date windows, and every assertion is scoped by a
// fresh receiver or sender, so parallel packages cannot change the counts.
var vn = time.FixedZone("ICT", 7*3600)

func march(day, hour, minute int) time.Time {
	return time.Date(2004, time.March, day, hour, minute, 0, 0, vn)
}

type reviewKudoSpec struct {
	sender, receiver uuid.UUID
	title, content   string
	at               time.Time
	spam, anonymous  bool
	hashtags         []string
}

func insertReviewKudo(t *testing.T, tdb *testkit.TestDatabase, s reviewKudoSpec) uuid.UUID {
	t.Helper()
	if s.title == "" {
		s.title = "Review fixture"
	}
	if s.content == "" {
		s.content = "<p>Thank you</p>"
	}
	status := map[bool]string{false: "public", true: "spam"}[s.spam]
	var id uuid.UUID
	ctx := context.Background()
	if err := tdb.Owner.QueryRow(ctx, `
		insert into public.kudos (sender_id, receiver_id, title, content, is_anonymous, status, created_at, updated_at)
		values ($1, $2, $3, $4, $5, $6::kudo_status, $7, $7) returning id`,
		s.sender, s.receiver, s.title, s.content, s.anonymous, status, s.at).Scan(&id); err != nil {
		t.Fatal(err)
	}
	for _, tag := range s.hashtags {
		if _, err := tdb.Owner.Exec(ctx, `
			with h as (insert into public.hashtags (name) values ($2) on conflict (name) do update set name = excluded.name returning id)
			insert into public.kudo_hashtags (kudo_id, hashtag_id) select $1, id from h`, id, tag); err != nil {
			t.Fatal(err)
		}
	}
	return id
}

func listIDs(t *testing.T, svc *moderation.ReviewService, query string, page int32) (moderation.ReviewPage, []uuid.UUID) {
	t.Helper()
	values, err := url.ParseQuery(query)
	if err != nil {
		t.Fatal(err)
	}
	got, err := svc.List(context.Background(), kudo.Viewer{IsAdmin: true}, moderation.ParseReviewFilter(values), page)
	if err != nil {
		t.Fatal(err)
	}
	ids := make([]uuid.UUID, len(got.Items))
	for i, item := range got.Items {
		ids[i] = item.ID
	}
	return got, ids
}

// F011 SC-001 (FR-101, FR-102, FR-203, FR-204, FR-205, FR-206, BR-001, BR-005):
// each filter and their combination return the exact set, newest first, 20 a
// page with the last page clamped, whole report days, plain-text search.
func TestReviewListFiltersPagingAndSearch(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := moderation.NewReviewService(db.New(tdb.App))
	an, binh := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	receiver := tdb.CreateSunner(t, testkit.SunnerSpec{})

	var all []uuid.UUID // newest first
	for i := range 45 {
		sender := map[bool]uuid.UUID{true: an, false: binh}[i%3 == 0]
		id := insertReviewKudo(t, tdb, reviewKudoSpec{sender: sender, receiver: receiver, at: march(1, 8, i), spam: i%5 == 0})
		all = append([]uuid.UUID{id}, all...)
	}
	r := "receiver=" + receiver.String()
	page1, ids := listIDs(t, svc, r, 1)
	if page1.Total != 45 || page1.Page != 1 || page1.PageSize != 20 || !slices.Equal(ids, all[:20]) {
		t.Fatalf("page 1 = total %d page %d, ids match %v", page1.Total, page1.Page, slices.Equal(ids, all[:20]))
	}
	if clamped, ids := listIDs(t, svc, r, 9); clamped.Page != 3 || !slices.Equal(ids, all[40:]) {
		t.Fatalf("page 9 = page %d with %d rows, want the last page (3) with 5", clamped.Page, len(ids))
	}

	got, _ := listIDs(t, svc, r+"&sender="+an.String()+"&status=spam", 1)
	if got.Total != 3 { // i = 0, 15, 30: from An and multiple of 5
		t.Fatalf("An + spam total = %d, want 3", got.Total)
	}
	for _, item := range got.Items {
		if item.Sender == nil || item.Sender.ID != an || item.Status != db.KudoStatusSpam {
			t.Fatalf("An + spam row = %+v", item)
		}
	}
	if got, _ := listIDs(t, svc, r+"&status=bogus&sender=nope&from=2004-03-02&to=2004-03-01", 1); got.Total != 45 ||
		got.Filters.From != nil || got.Filters.Status != nil || got.Filters.Sender != nil {
		t.Fatalf("invalid filters are not dropped: total %d, applied %+v", got.Total, got.Filters)
	}

	// Whole report days, both ends included (FR-204): 10 Mar 23:30 is in "to 10 Mar", 11 Mar 00:10 is not.
	days := tdb.CreateSunner(t, testkit.SunnerSpec{})
	edgeStart := insertReviewKudo(t, tdb, reviewKudoSpec{sender: an, receiver: days, at: march(5, 0, 0)})
	edgeEnd := insertReviewKudo(t, tdb, reviewKudoSpec{sender: an, receiver: days, at: march(10, 23, 30)})
	insertReviewKudo(t, tdb, reviewKudoSpec{sender: an, receiver: days, at: march(4, 23, 59)})
	insertReviewKudo(t, tdb, reviewKudoSpec{sender: an, receiver: days, at: march(11, 0, 10)})
	if got, ids := listIDs(t, svc, "from=2004-03-05&to=2004-03-10", 1); !slices.Equal(ids, []uuid.UUID{edgeEnd, edgeStart}) ||
		*got.Filters.From != "2004-03-05" || *got.Filters.To != "2004-03-10" {
		t.Fatalf("5..10 March = %v (applied %v..%v), want exactly the two edge kudos", ids, got.Filters.From, got.Filters.To)
	}

	// Search: title or the body's visible text, case-insensitive; wildcards and tags are plain text.
	words := tdb.CreateSunner(t, testkit.SunnerSpec{})
	w := "receiver=" + words.String() + "&q="
	body := insertReviewKudo(t, tdb, reviewKudoSpec{sender: an, receiver: words, at: march(20, 9, 0),
		content: "<p>Cảm ơn người em bình thường nhưng <strong>PHI THƯỜNG</strong></p><p>Tom &amp; Jerry</p>"})
	title := insertReviewKudo(t, tdb, reviewKudoSpec{sender: an, receiver: words, at: march(20, 10, 0), title: "Tăng 50% hiệu suất"})
	insertReviewKudo(t, tdb, reviewKudoSpec{sender: an, receiver: words, at: march(20, 11, 0), title: "Tăng 500 hiệu suất"})
	for q, want := range map[string][]uuid.UUID{
		url.QueryEscape("phi thường"):  {body},
		url.QueryEscape("Tom & Jerry"): {body},
		url.QueryEscape("50%"):         {title},
		"strong":                       nil, // a tag name is not text
		url.QueryEscape("Jerry Tăng"):  nil,
	} {
		if _, ids := listIDs(t, svc, w+q, 1); !slices.Equal(ids, want) {
			t.Errorf("q=%s -> %v, want %v", q, ids, want)
		}
	}
}

// F011 SC-002 (FR-201, FR-202, BR-004, BR-009): the admin row of an anonymous
// kudo keeps the real sender with the marker, the shared rule masks it for any
// other viewer, and the people options list only actual senders / receivers.
func TestReviewAnonymousMarkerAndPeopleOptions(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := moderation.NewReviewService(db.New(tdb.App))
	tag := "P12People" + uuid.NewString()[:6]
	sender := tdb.CreateSunner(t, testkit.SunnerSpec{Name: tag + " Sender"})
	receiver := tdb.CreateSunner(t, testkit.SunnerSpec{Name: tag + " Receiver"})
	tdb.CreateSunner(t, testkit.SunnerSpec{Name: tag + " Idle"})
	id := insertReviewKudo(t, tdb, reviewKudoSpec{sender: sender, receiver: receiver, at: march(25, 9, 0), anonymous: true, hashtags: []string{"p12tag"}})

	values := url.Values{"receiver": {receiver.String()}}
	got, err := svc.List(context.Background(), kudo.Viewer{IsAdmin: true}, moderation.ParseReviewFilter(values), 1)
	if err != nil || len(got.Items) != 1 || got.Items[0].ID != id || !got.Items[0].IsAnonymous ||
		got.Items[0].Sender == nil || got.Items[0].Sender.ID != sender || !slices.Equal(got.Items[0].Hashtags, []string{"p12tag"}) {
		t.Fatalf("admin row = %+v, %v; want the real sender with the anonymous marker", got.Items, err)
	}
	masked, err := svc.List(context.Background(), kudo.Viewer{ID: receiver}, moderation.ParseReviewFilter(values), 1)
	if err != nil || masked.Items[0].Sender != nil {
		t.Fatalf("non-admin viewer row = %+v, %v; the shared rule must mask the sender", masked.Items, err)
	}

	names := func(asSender bool) []string {
		people, err := svc.People(context.Background(), asSender, tag)
		if err != nil {
			t.Fatal(err)
		}
		out := make([]string, len(people))
		for i, p := range people {
			out[i] = p.Name
		}
		return out
	}
	if got := names(true); !slices.Equal(got, []string{tag + " Sender"}) {
		t.Errorf("sender options = %v, want only the sender", got)
	}
	if got := names(false); !slices.Equal(got, []string{tag + " Receiver"}) {
		t.Errorf("receiver options = %v, want only the receiver", got)
	}
}

// F011 SC-007 (BR-007, Codex R21): browser roles cannot read kudos around the
// API; the review data exists only behind RequireAdmin.
func TestBrowserRolesCannotReadKudosDirectly(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	ctx := context.Background()
	for _, role := range []string{"anon", "authenticated"} {
		tx, err := tdb.Owner.Begin(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := tx.Exec(ctx, "set local role "+role); err != nil {
			t.Fatal(err)
		}
		_, err = tx.Exec(ctx, "select id, sender_id, is_anonymous from public.kudos limit 1")
		var pgErr *pgconn.PgError
		if !errors.As(err, &pgErr) || pgErr.Code != "42501" {
			t.Errorf("read kudos as %s: err = %v, want permission denied (42501)", role, err)
		}
		_ = tx.Rollback(ctx)
	}
}
