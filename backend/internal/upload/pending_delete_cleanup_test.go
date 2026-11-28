package upload

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
)

// blockingCleaner hands over the context it was given, then waits to be released.
type blockingCleaner struct {
	got     chan context.Context
	release chan struct{}
}

func (b blockingCleaner) Cleanup(ctx context.Context, _ []RemovedUpload) {
	b.got <- ctx
	<-b.release
}

// Reviewer W1 (Codex R04, R23): the edit's post-commit cleanup never delays the
// answer; it runs detached from the request (a finished or cancelled request
// does not stop it) and bounded by its own deadline.
func TestAsyncCleanerReturnsAtOnceUnderADetachedBoundedContext(t *testing.T) {
	inner := blockingCleaner{got: make(chan context.Context, 1), release: make(chan struct{})}
	defer close(inner.release)
	request, endRequest := context.WithCancel(context.Background())

	start := time.Now()
	NewAsyncCleaner(inner).Cleanup(request, []RemovedUpload{{ID: uuid.New(), ObjectPath: ObjectPath("x.png")}})
	if elapsed := time.Since(start); elapsed > 50*time.Millisecond {
		t.Fatalf("Cleanup blocked the caller for %v", elapsed)
	}
	endRequest()

	select {
	case ctx := <-inner.got:
		deadline, bounded := ctx.Deadline()
		if ctx.Err() != nil || !bounded || time.Until(deadline) > PostCommitCleanupTimeout {
			t.Fatalf("cleanup context err %v, deadline %v (bounded %v); want live and bounded by %v", ctx.Err(), deadline, bounded, PostCommitCleanupTimeout)
		}
	case <-time.After(time.Second):
		t.Fatal("the inner cleaner never ran")
	}
}

func TestAsyncCleanerSkipsAnEmptyList(t *testing.T) {
	inner := blockingCleaner{got: make(chan context.Context, 1), release: make(chan struct{})}
	defer close(inner.release)
	NewAsyncCleaner(inner).Cleanup(context.Background(), nil)
	select {
	case <-inner.got:
		t.Fatal("cleaner ran for an empty list")
	case <-time.After(50 * time.Millisecond):
	}
}
