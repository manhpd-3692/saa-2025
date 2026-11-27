//go:build integration

package dbx_test

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

const insufficientPrivilege = "42501"

// F002 SC-010 (Codex R21): a direct read as `anon` or `authenticated` of every
// business table and of the kudo_heart_state view is refused.
func TestBrowserRolesCannotReadBusinessData(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	relations := append(slices.Clone(testkit.BusinessTables), testkit.BusinessViews...)

	for _, role := range []string{"anon", "authenticated"} {
		for _, relation := range relations {
			t.Run(role+"/"+relation, func(t *testing.T) {
				err := pgx.BeginFunc(context.Background(), tdb.Owner, func(tx pgx.Tx) error {
					if _, err := tx.Exec(context.Background(), "set local role "+role); err != nil {
						return fmt.Errorf("set role: %w", err)
					}
					_, err := tx.Exec(context.Background(), "select 1 from public."+relation+" limit 1")
					return err
				})
				var pgErr *pgconn.PgError
				if !errors.As(err, &pgErr) || pgErr.Code != insufficientPrivilege {
					t.Fatalf("read as %s: err = %v, want permission denied (42501)", role, err)
				}
			})
		}
	}
}

// Every table in public has RLS on with no policy (deny-all), and the lists
// above cover every public relation, so a new table cannot slip past this test.
func TestEveryPublicRelationIsDenyAllAndListed(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	rows, err := tdb.Owner.Query(context.Background(), `
		select c.relname, c.relkind::text, c.relrowsecurity,
		       (select count(*) from pg_policy p where p.polrelid = c.oid)
		from pg_class c join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')`)
	if err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	for rows.Next() {
		var name, kind string
		var rls bool
		var policies int
		if err := rows.Scan(&name, &kind, &rls, &policies); err != nil {
			t.Fatal(err)
		}
		seen[name] = true
		listed := slices.Contains(testkit.BusinessTables, name) || slices.Contains(testkit.BusinessViews, name)
		if !listed {
			t.Errorf("public.%s is not in testkit.BusinessTables/BusinessViews (grants unchecked)", name)
		}
		if kind == "r" && (!rls || policies != 0) {
			t.Errorf("public.%s: rls=%v policies=%d, want RLS on with no policies", name, rls, policies)
		}
	}
	if err := rows.Err(); err != nil {
		t.Fatal(err)
	}
	for _, name := range append(slices.Clone(testkit.BusinessTables), testkit.BusinessViews...) {
		if !seen[name] {
			t.Errorf("public.%s missing from the schema", name)
		}
	}
}

// Go connects as saa_api (BYPASSRLS) and can read every business relation.
func TestSaaAPIRoleCanQueryBusinessData(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	ctx := context.Background()
	var user string
	var bypassRLS bool
	err := tdb.App.QueryRow(ctx,
		`select current_user, rolbypassrls from pg_roles where rolname = current_user`).Scan(&user, &bypassRLS)
	if err != nil || user != "saa_api" || !bypassRLS {
		t.Fatalf("DATABASE_URL connects as %q (bypassrls=%v, err=%v), want saa_api with BYPASSRLS", user, bypassRLS, err)
	}
	for _, relation := range append(slices.Clone(testkit.BusinessTables), testkit.BusinessViews...) {
		var n int64
		if err := tdb.App.QueryRow(ctx, "select count(*) from public."+relation).Scan(&n); err != nil {
			t.Errorf("saa_api select from %s: %v", relation, err)
		}
	}
}

// F002 SC-010: saa_api runs the A0 profile query under RLS deny-all.
func TestSaaAPIRunsGetProfileAuth(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	ctx := context.Background()
	email := "sc010-" + uuid.NewString()[:8] + "@sun-asterisk.com"
	id := tdb.CreateAuthUser(t, email)
	queries := db.New(tdb.App)

	if _, err := queries.GetProfileAuth(ctx, id); !errors.Is(err, pgx.ErrNoRows) {
		t.Fatalf("GetProfileAuth before provision: err = %v, want pgx.ErrNoRows", err)
	}
	if _, err := tdb.App.Exec(ctx, `insert into public.users (id, email, name) values ($1, $2, 'SC-010')`,
		id, email); err != nil {
		t.Fatalf("saa_api insert users: %v", err)
	}
	row, err := queries.GetProfileAuth(ctx, id)
	if err != nil || row.ID != id || row.Role != db.UserRoleUser {
		t.Fatalf("GetProfileAuth = %+v, %v; want default role user", row, err)
	}
}
