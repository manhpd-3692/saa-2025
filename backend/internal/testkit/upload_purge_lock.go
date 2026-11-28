//go:build integration

package testkit

import (
	"context"
	"testing"
)

// uploadPurgeLockKey names the advisory lock that serializes, across test
// packages (go test runs packages in parallel), the manual upload purge with
// tests that assert on pending_delete or day-old pending uploads: the purge is
// global by design and would otherwise remove another package's fixture.
const uploadPurgeLockKey = "saa-test-kudo-upload-purge"

// HoldUploadPurgeLock takes the advisory lock on a dedicated owner connection
// and keeps it until the test ends. Call it first in any integration test that
// runs upload.PurgeStaleUploads or needs a pending_delete row to survive.
func (d *TestDatabase) HoldUploadPurgeLock(t testing.TB) {
	t.Helper()
	ctx := context.Background()
	conn, err := d.Owner.Acquire(ctx)
	if err != nil {
		t.Fatalf("testkit: acquire purge lock connection: %v", err)
	}
	if _, err := conn.Exec(ctx, `select pg_advisory_lock(hashtext($1))`, uploadPurgeLockKey); err != nil {
		conn.Release()
		t.Fatalf("testkit: take upload purge lock: %v", err)
	}
	t.Cleanup(func() {
		if _, err := conn.Exec(context.Background(), `select pg_advisory_unlock(hashtext($1))`, uploadPurgeLockKey); err != nil {
			t.Errorf("testkit: release upload purge lock: %v", err)
		}
		conn.Release()
	})
}
