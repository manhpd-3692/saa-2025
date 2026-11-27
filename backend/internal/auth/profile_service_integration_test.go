//go:build integration

package auth_test

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

func newProfileService(t *testing.T, tdb *testkit.TestDatabase, adminEmails ...string) *auth.ProfileService {
	t.Helper()
	reader, err := auth.NewSupabaseIdentityReader(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY"))
	if err != nil {
		t.Fatal(err)
	}
	return auth.NewProfileService(tdb.App, db.New(tdb.App), reader, adminEmails)
}

// identityFor is what A0 extracted from a verified token. The token's
// user_metadata may claim email_verified; provisioning never trusts it.
func identityFor(id uuid.UUID, email string) auth.VerifiedIdentity {
	return auth.VerifiedIdentity{UserID: id, Email: email, Provider: "google", Providers: []string{"google"},
		Name: "Name From user_metadata"}
}

type profileRow struct {
	Role      string
	Name      string
	LastLogin *time.Time
}

func readProfile(t *testing.T, tdb *testkit.TestDatabase, id uuid.UUID) (profileRow, int) {
	t.Helper()
	var n int
	if err := tdb.Owner.QueryRow(context.Background(), `select count(*) from public.users where id = $1`, id).Scan(&n); err != nil || n == 0 {
		return profileRow{}, n
	}
	var p profileRow
	if err := tdb.Owner.QueryRow(context.Background(), `select role::text, name, last_login_at from public.users where id = $1`,
		id).Scan(&p.Role, &p.Name, &p.LastLogin); err != nil {
		t.Fatal(err)
	}
	return p, n
}

// F002 SC-001, SC-002 (BR-001): first sign-in creates one row with role user
// and the Google identity's name; a second sign-in adds no row, refreshes
// last_login_at and keeps the role; ADMIN_EMAILS gets admin on insert.
func TestProvisionCreatesThenRefreshesTheProfile(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	adminEmail := testkit.UniqueEmail("provision.admin")
	svc := newProfileService(t, tdb, adminEmail)
	email := testkit.UniqueEmail("provision.user")
	id := tdb.CreateSunner(t, testkit.SunnerSpec{Email: email, Name: "Google Name", NoProfile: true})
	ctx := context.Background()

	me, err := svc.Provision(ctx, identityFor(id, email))
	first, rows := readProfile(t, tdb, id)
	if err != nil || rows != 1 || first.Role != "user" || first.Name != "Google Name" || first.LastLogin == nil ||
		me.ID != id || me.Role != db.UserRoleUser || me.AvatarURL == nil {
		t.Fatalf("first provision = %+v, %v; row %+v (%d)", me, err, first, rows)
	}
	time.Sleep(10 * time.Millisecond)
	if _, err := svc.Provision(ctx, identityFor(id, email)); err != nil {
		t.Fatal(err)
	}
	second, rows := readProfile(t, tdb, id)
	if rows != 1 || second.Role != "user" || !second.LastLogin.After(*first.LastLogin) {
		t.Fatalf("second provision row %+v (%d), want one row, newer last_login_at, same role", second, rows)
	}

	adminID := tdb.CreateSunner(t, testkit.SunnerSpec{Email: adminEmail, NoProfile: true})
	if me, err := svc.Provision(ctx, identityFor(adminID, adminEmail)); err != nil || me.Role != db.UserRoleAdmin {
		t.Fatalf("ADMIN_EMAILS provision = %+v, %v; want role admin", me, err)
	}
	// A listed email is promoted on a later sign-in; sign-in never demotes.
	if _, err := tdb.Owner.Exec(ctx, `update public.users set role = 'user' where id = $1`, adminID); err != nil {
		t.Fatal(err)
	}
	if me, err := svc.Provision(ctx, identityFor(adminID, adminEmail)); err != nil || me.Role != db.UserRoleAdmin {
		t.Fatalf("listed email re-provision = %+v, %v; want promoted to admin", me, err)
	}
	if me, err := newProfileService(t, tdb).Provision(ctx, identityFor(adminID, adminEmail)); err != nil || me.Role != db.UserRoleAdmin {
		t.Fatalf("provision after removal from ADMIN_EMAILS = %+v, %v; want admin kept (never demotes)", me, err)
	}
}

// Gap log C08 (F002 SC-007): eligibility comes from the Google identity stored
// by Supabase Auth, not from client-writable user_metadata. An unverified,
// missing or non-Google identity is refused and nothing is written.
func TestProvisionRequiresAVerifiedGoogleIdentity(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := newProfileService(t, tdb)
	cases := map[string]*testkit.IdentitySpec{
		"unverified Google identity": {Provider: "google", EmailVerified: false},
		"no identity":                {Omit: true},
		"non-Google identity":        {Provider: "github", EmailVerified: true},
	}
	for name, identity := range cases {
		t.Run(name, func(t *testing.T) {
			email := testkit.UniqueEmail("c08")
			id := tdb.CreateSunner(t, testkit.SunnerSpec{Email: email, NoProfile: true, Identity: identity})
			if _, err := svc.Provision(context.Background(), identityFor(id, email)); !errors.Is(err, auth.ErrIneligibleIdentity) {
				t.Fatalf("err = %v, want ErrIneligibleIdentity", err)
			}
			if _, rows := readProfile(t, tdb, id); rows != 0 {
				t.Fatalf("an ineligible identity was provisioned (%d rows)", rows)
			}
		})
	}
	// A token whose email differs from the verified Google email is refused too.
	id := tdb.CreateSunner(t, testkit.SunnerSpec{NoProfile: true})
	if _, err := svc.Provision(context.Background(), identityFor(id, testkit.UniqueEmail("other"))); !errors.Is(err, auth.ErrIneligibleIdentity) {
		t.Fatalf("mismatched email: err = %v, want ErrIneligibleIdentity", err)
	}
}
