//go:build integration

package admin

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// reportFixture builds admin-report data through the owner connection. Units
// are fresh per test (unique code), activity is dated in February 2003 so no
// other suite's rows fall into the report windows, and every row goes away
// with its Sunner or unit when the test ends.
type reportFixture struct {
	t       *testing.T
	tdb     *testkit.TestDatabase
	service *Service
}

func newReportFixture(t *testing.T) *reportFixture {
	t.Helper()
	tdb := testkit.OpenTestDatabase(t)
	return &reportFixture{t: t, tdb: tdb, service: NewService(db.New(tdb.App))}
}

func (f *reportFixture) exec(sql string, args ...any) {
	f.t.Helper()
	if _, err := f.tdb.Owner.Exec(context.Background(), sql, args...); err != nil {
		f.t.Fatalf("fixture %q: %v", sql, err)
	}
}

// unit creates a unit with a unique code and returns its id and code.
func (f *reportFixture) unit() (uuid.UUID, string) {
	f.t.Helper()
	code := "T" + uuid.NewString()[:8]
	var id uuid.UUID
	if err := f.tdb.Owner.QueryRow(context.Background(),
		`insert into public.units (name, code) values ($1, $1) returning id`, code).Scan(&id); err != nil {
		f.t.Fatalf("create unit: %v", err)
	}
	f.t.Cleanup(func() {
		if _, err := f.tdb.Owner.Exec(context.Background(), `delete from public.units where id = $1`, id); err != nil {
			f.t.Errorf("delete unit: %v", err)
		}
	})
	return id, code
}

// sunner creates a Sunner in the unit (nil: no unit) with the given role.
func (f *reportFixture) sunner(name string, unit *uuid.UUID, admin bool) uuid.UUID {
	f.t.Helper()
	id := f.tdb.CreateSunner(f.t, testkit.SunnerSpec{Name: name, Admin: admin})
	f.exec(`update public.users set unit_id = $2 where id = $1`, id, unit)
	return id
}

// kudo inserts a kudo created at `at` (public, or spam).
func (f *reportFixture) kudo(sender, receiver uuid.UUID, at time.Time, spam bool) uuid.UUID {
	f.t.Helper()
	status := "public"
	if spam {
		status = "spam"
	}
	var id uuid.UUID
	if err := f.tdb.Owner.QueryRow(context.Background(), `
		insert into public.kudos (sender_id, receiver_id, title, content, status, created_at, updated_at)
		values ($1, $2, 'Report kudo', '<p>Thanks</p>', $3::kudo_status, $4, $4) returning id`,
		sender, receiver, status, at).Scan(&id); err != nil {
		f.t.Fatalf("create kudo: %v", err)
	}
	return id
}

// heart stores a heart with its fixed weight and campaign (F008 BR-004).
func (f *reportFixture) heart(kudo, user uuid.UUID, weight int, campaign *uuid.UUID) {
	f.t.Helper()
	f.exec(`insert into public.hearts (kudo_id, user_id, weight, campaign_id) values ($1, $2, $3, $4)`,
		kudo, user, weight, campaign)
}

// campaign creates an x2 campaign authored by createdBy (deleted with it). It ran in February
// 2003, so it is never the active campaign another suite's hearts would pick up while this one
// runs alongside (heart weights are stored on the heart; the campaign only has to exist).
func (f *reportFixture) campaign(createdBy uuid.UUID) uuid.UUID {
	f.t.Helper()
	var id uuid.UUID
	if err := f.tdb.Owner.QueryRow(context.Background(), `
		insert into public.campaigns (name, starts_at, ends_at, multiplier, created_by)
		values ('Report x2', '2003-02-01T00:00:00+07:00', '2003-02-28T00:00:00+07:00', 2, $1) returning id`,
		createdBy).Scan(&id); err != nil {
		f.t.Fatalf("create campaign: %v", err)
	}
	return id
}

// box grants secret box `seq` at `earned`; with an icon it was opened at `opened`.
func (f *reportFixture) box(user uuid.UUID, seq int, earned time.Time, icon string, opened time.Time) {
	f.t.Helper()
	if icon == "" {
		f.exec(`insert into public.secret_boxes (user_id, seq, earned_at) values ($1, $2, $3)`, user, seq, earned)
		return
	}
	f.exec(`insert into public.secret_boxes (user_id, seq, earned_at, opened_at, icon)
		values ($1, $2, $3, $4, $5::secret_box_icon)`, user, seq, earned, opened, icon)
}

// vn is a wall-clock time in the report time zone (UTC+7).
func vn(day, hour, minute, second int) time.Time {
	return time.Date(2003, time.February, day, hour, minute, second, 0, reportLocation)
}

var allIcons = []string{"REVIVAL", "TOUCH_OF_LIGHT", "STAY_GOLD", "FLOW_TO_HORIZON", "BEYOND_THE_BOUNDARY", "ROOT_FURTHER"}
