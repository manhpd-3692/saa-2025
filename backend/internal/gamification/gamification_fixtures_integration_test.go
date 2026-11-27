//go:build integration

package gamification_test

import (
	"context"
	"errors"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// recordingNotifier remembers every notification request.
type recordingNotifier struct {
	mu     sync.Mutex
	inputs []notification.CreateInput
}

func (r *recordingNotifier) Create(_ context.Context, in notification.CreateInput) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.inputs = append(r.inputs, in)
}

func (r *recordingNotifier) kinds() map[notification.Kind]int {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := map[notification.Kind]int{}
	for _, in := range r.inputs {
		out[in.Kind]++
	}
	return out
}

// stallingNotifier blocks until its (detached, 2 s) context ends.
type stallingNotifier struct{}

func (stallingNotifier) Create(ctx context.Context, _ notification.CreateInput) { <-ctx.Done() }

// failingCampaigns forces the in-transaction lookup to fail (F008 SC-010).
type failingCampaigns struct{}

func (failingCampaigns) HeartWeight(context.Context, *db.Queries) (gamification.HeartWeight, error) {
	return gamification.HeartWeight{}, errors.New("campaigns table unreachable")
}

// closedPool makes the real NotificationService fail on every call.
func closedPool(t *testing.T, tdb *testkit.TestDatabase) *pgxpool.Pool {
	t.Helper()
	pool, err := pgxpool.NewWithConfig(context.Background(), tdb.App.Config())
	if err != nil {
		t.Fatal(err)
	}
	pool.Close()
	return pool
}

// clearActiveCampaigns removes campaigns active now so a weight-1 case holds
// (the dev seed creates none; tests create theirs through createCampaign).
func clearActiveCampaigns(t *testing.T, tdb *testkit.TestDatabase) {
	t.Helper()
	if _, err := tdb.Owner.Exec(context.Background(),
		`delete from public.campaigns where starts_at <= now() and now() < ends_at`); err != nil {
		t.Fatal(err)
	}
}

func createCampaign(t *testing.T, tdb *testkit.TestDatabase, admin uuid.UUID, multiplier int, active bool) uuid.UUID {
	t.Helper()
	window := `now() - interval '1 hour', now() + interval '1 hour'`
	if !active {
		window = `now() - interval '2 hours', now() - interval '1 hour'`
	}
	var id uuid.UUID
	err := tdb.Owner.QueryRow(context.Background(), `
		insert into public.campaigns (name, starts_at, ends_at, multiplier, created_by)
		values ('Test x' || $1::int::text, `+window+`, $1::int, $2) returning id`, multiplier, admin).Scan(&id)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

type heartRow struct {
	Weight     int32
	CampaignID *uuid.UUID
}

func heartsOn(t *testing.T, tdb *testkit.TestDatabase, kudoID uuid.UUID) map[uuid.UUID]heartRow {
	t.Helper()
	rows, err := tdb.Owner.Query(context.Background(),
		`select user_id, weight, campaign_id from public.hearts where kudo_id = $1`, kudoID)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	out := map[uuid.UUID]heartRow{}
	for rows.Next() {
		var user uuid.UUID
		var h heartRow
		if err := rows.Scan(&user, &h.Weight, &h.CampaignID); err != nil {
			t.Fatal(err)
		}
		out[user] = h
	}
	return out
}

func countBoxes(t *testing.T, tdb *testkit.TestDatabase, userID uuid.UUID) int {
	t.Helper()
	var n int
	if err := tdb.Owner.QueryRow(context.Background(),
		`select count(*) from public.secret_boxes where user_id = $1`, userID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// insertHearts gives `n` weight-1 hearts on kudoID from fresh Sunners.
func insertHearts(t *testing.T, tdb *testkit.TestDatabase, kudoID uuid.UUID, n int) {
	t.Helper()
	for range n {
		user := tdb.CreateSunner(t, testkit.SunnerSpec{})
		if _, err := tdb.Owner.Exec(context.Background(),
			`insert into public.hearts (kudo_id, user_id, weight) values ($1, $2, 1)`, kudoID, user); err != nil {
			t.Fatal(err)
		}
	}
}

// startTogether runs every fn in its own goroutine released by one barrier and
// returns their errors in order.
func startTogether(fns ...func() error) []error {
	errs := make([]error, len(fns))
	release := make(chan struct{})
	var wg sync.WaitGroup
	for i, fn := range fns {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-release
			errs[i] = fn()
		}()
	}
	close(release)
	wg.Wait()
	return errs
}
