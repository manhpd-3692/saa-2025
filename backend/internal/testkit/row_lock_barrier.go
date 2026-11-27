//go:build integration

package testkit

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// RowLockBarrier holds a row lock in its own owner transaction, the same lock
// a production transaction takes, so a concurrency test can queue production
// transactions behind it, prove they really wait there, then release them
// together (plan phase 02: test-held row locks plus goroutines). Remove the
// production lock query and WaitForWaiters fails: nothing queues.
type RowLockBarrier struct {
	tx    pgx.Tx
	pid   uint32
	owner *pgxpool.Pool
}

// HoldRowLock runs lockSQL (a `select ... for no key update` / `for update`)
// in a new transaction and keeps it open until Release or the test's end.
func (d *TestDatabase) HoldRowLock(t testing.TB, lockSQL string, args ...any) *RowLockBarrier {
	t.Helper()
	ctx := context.Background()
	tx, err := d.Owner.Begin(ctx)
	if err != nil {
		t.Fatalf("testkit: begin row lock barrier: %v", err)
	}
	t.Cleanup(func() { _ = tx.Rollback(context.Background()) })
	b := &RowLockBarrier{tx: tx, pid: tx.Conn().PgConn().PID(), owner: d.Owner}
	tag, err := tx.Exec(ctx, lockSQL, args...)
	if err != nil || tag.RowsAffected() != 1 {
		t.Fatalf("testkit: row lock barrier locked %d rows: %v", tag.RowsAffected(), err)
	}
	return b
}

// waitersQuery counts backends waiting on the barrier: directly on its row, or
// queued behind such a waiter (the first waiter holds the tuple lock the next
// one waits on). Scoped to this barrier, so parallel test packages don't count.
const waitersQuery = `
	with recursive blocked(pid) as (
		select pid from pg_stat_activity where $1::int = any(pg_blocking_pids(pid))
		union
		select a.pid from pg_stat_activity a, blocked b where b.pid = any(pg_blocking_pids(a.pid))
	)
	select count(*) from blocked`

// WaitForWaiters fails the test unless exactly n transactions are blocked
// behind the barrier within 5 s.
func (b *RowLockBarrier) WaitForWaiters(t testing.TB, n int) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	got := 0
	for time.Now().Before(deadline) {
		if err := b.owner.QueryRow(context.Background(), waitersQuery, int(b.pid)).Scan(&got); err != nil {
			t.Fatalf("testkit: count lock waiters: %v", err)
		}
		if got == n {
			return
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("testkit: %d transactions wait on the row lock, want %d (is the production lock query gone?)", got, n)
}

// Release ends the barrier transaction; the queued transactions proceed.
func (b *RowLockBarrier) Release(t testing.TB) {
	t.Helper()
	if err := b.tx.Rollback(context.Background()); err != nil {
		t.Fatalf("testkit: release row lock barrier: %v", err)
	}
}

// RunQueued starts every fn in its own goroutine, waits until all of them are
// blocked behind the barrier, releases it, and returns their errors in order.
func (b *RowLockBarrier) RunQueued(t testing.TB, fns ...func() error) []error {
	t.Helper()
	errs := make([]error, len(fns))
	var wg sync.WaitGroup
	for i, fn := range fns {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs[i] = fn()
		}()
	}
	b.WaitForWaiters(t, len(fns))
	b.Release(t)
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("testkit: queued transactions did not finish after the release (deadlock?)")
	}
	return errs
}
