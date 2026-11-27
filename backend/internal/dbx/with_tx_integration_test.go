//go:build integration

package dbx_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// insertProbeUnit writes a uniquely coded unit inside tx and returns the code.
func insertProbeUnit(ctx context.Context, t *testing.T, tx pgx.Tx) string {
	t.Helper()
	code := "TX-" + uuid.NewString()
	if _, err := tx.Exec(ctx, `insert into public.units (name, code) values ('dbx probe', $1)`, code); err != nil {
		t.Fatalf("insert probe unit: %v", err)
	}
	return code
}

func unitExists(t *testing.T, tdb *testkit.TestDatabase, code string) bool {
	t.Helper()
	var exists bool
	err := tdb.App.QueryRow(context.Background(),
		`select exists(select 1 from public.units where code = $1)`, code).Scan(&exists)
	if err != nil {
		t.Fatal(err)
	}
	return exists
}

func TestWithTxCommitsOnSuccess(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	var code string
	err := dbx.WithTx(context.Background(), tdb.App, func(ctx context.Context, tx pgx.Tx) error {
		code = insertProbeUnit(ctx, t, tx)
		return nil
	})
	t.Cleanup(func() {
		_, _ = tdb.App.Exec(context.Background(), `delete from public.units where code = $1`, code)
	})
	if committed := unitExists(t, tdb, code); err != nil || !committed {
		t.Fatalf("WithTx err = %v, committed = %v; want committed row", err, committed)
	}
}

func TestWithTxRollsBackOnError(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	sentinel := errors.New("business rule failed")
	var code string
	err := dbx.WithTx(context.Background(), tdb.App, func(ctx context.Context, tx pgx.Tx) error {
		code = insertProbeUnit(ctx, t, tx)
		return sentinel
	})
	if kept := unitExists(t, tdb, code); !errors.Is(err, sentinel) || kept {
		t.Fatalf("WithTx err = %v, row kept = %v; want sentinel and rollback", err, kept)
	}
}

// R23: the per-request deadline bounds the queries inside the transaction.
func TestWithTxTimeoutAbortsSlowWork(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	var code string
	start := time.Now()
	err := dbx.WithTxTimeout(context.Background(), tdb.App, 300*time.Millisecond, func(ctx context.Context, tx pgx.Tx) error {
		code = insertProbeUnit(ctx, t, tx)
		_, err := tx.Exec(ctx, "select pg_sleep(5)")
		return err
	})
	elapsed := time.Since(start)
	if kept := unitExists(t, tdb, code); !errors.Is(err, context.DeadlineExceeded) || elapsed > 3*time.Second || kept {
		t.Fatalf("WithTxTimeout err = %v after %s, row kept = %v; want deadline exceeded, no row", err, elapsed, kept)
	}
}
