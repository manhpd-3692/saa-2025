//go:build integration

package testkit

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// BusinessTables are every table the API owns (migration rls_deny_all_and_grants).
// BusinessViews are the views over them. Keep both in sync with that migration.
var (
	BusinessTables = []string{
		"units", "users", "events", "kudos", "kudo_uploads", "kudo_images", "hashtags",
		"kudo_hashtags", "campaigns", "hearts", "secret_boxes", "notifications",
	}
	BusinessViews = []string{"kudo_heart_state"}
)

// TestDatabase is the local Supabase Postgres seen two ways:
//   - App connects with DATABASE_URL as role saa_api — exactly how the API connects;
//   - Owner connects with LOCAL_OWNER_DATABASE_URL (local `postgres`) to build
//     fixtures the API cannot (auth.users) and to inspect grants.
//
// Both URLs are required; Owner must be a loopback host.
type TestDatabase struct {
	App   *pgxpool.Pool
	Owner *pgxpool.Pool
}

// OpenTestDatabase connects both pools; they are closed when the test ends.
func OpenTestDatabase(t testing.TB) *TestDatabase {
	t.Helper()
	return &TestDatabase{
		App:   openPool(t, "DATABASE_URL", false),
		Owner: openPool(t, "LOCAL_OWNER_DATABASE_URL", true),
	}
}

func openPool(t testing.TB, envName string, requireLocal bool) *pgxpool.Pool {
	t.Helper()
	raw := strings.TrimSpace(os.Getenv(envName))
	if raw == "" {
		t.Fatalf("testkit: %s is required for -tags integration (see backend/README.md)", envName)
	}
	cfg, err := pgxpool.ParseConfig(raw)
	if err != nil {
		t.Fatalf("testkit: parse %s: %v", envName, err)
	}
	if requireLocal {
		if err := dbx.RequireLoopback(&cfg.ConnConfig.Config); err != nil {
			t.Fatalf("testkit: %s: %v", envName, err)
		}
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err == nil {
		err = pool.Ping(ctx)
	}
	if err != nil {
		t.Fatalf("testkit: connect %s: %v", envName, err)
	}
	t.Cleanup(pool.Close)
	return pool
}

// CreateAuthUser inserts a minimal Supabase auth.users row (users.id references
// it) for a verified Google identity and deletes it, cascading to public.users,
// when the test ends.
func (d *TestDatabase) CreateAuthUser(t testing.TB, email string) uuid.UUID {
	t.Helper()
	id := uuid.New()
	ctx := context.Background()
	_, err := d.Owner.Exec(ctx, `
		insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
			confirmation_token, recovery_token, email_change_token_new, email_change,
			raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
		values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, '', now(),
			'', '', '', '', '{"provider":"google","providers":["google"]}', '{"email_verified":true}', now(), now())`,
		id, email)
	if err != nil {
		t.Fatalf("testkit: create auth user: %v", err)
	}
	t.Cleanup(func() {
		if _, err := d.Owner.Exec(context.Background(), `delete from auth.users where id = $1`, id); err != nil {
			t.Errorf("testkit: delete auth user %s: %v", id, err)
		}
	})
	return id
}

// TruncateBusinessTables empties every business table except the `units`
// reference data, for suites that need a clean slate. It wipes local dev data
// too; re-run `go run ./cmd/seed` afterwards.
func (d *TestDatabase) TruncateBusinessTables(t testing.TB) {
	t.Helper()
	var tables []string
	for _, table := range BusinessTables {
		if table != "units" {
			tables = append(tables, "public."+table)
		}
	}
	if _, err := d.Owner.Exec(context.Background(), "truncate table "+strings.Join(tables, ", ")+" cascade"); err != nil {
		t.Fatalf("testkit: truncate business tables: %v", err)
	}
}
