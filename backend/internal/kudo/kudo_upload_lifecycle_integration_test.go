//go:build integration

package kudo_test

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// pausedCleaner records the uploads an edit marked pending_delete instead of
// deleting them: the post-commit cleanup "paused" between two edits (SC-009).
type pausedCleaner struct {
	mu      sync.Mutex
	removed []upload.RemovedUpload
}

func (c *pausedCleaner) Cleanup(_ context.Context, removed []upload.RemovedUpload) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.removed = append(c.removed, removed...)
}

func uploadState(t *testing.T, tdb *testkit.TestDatabase, id uuid.UUID) string {
	t.Helper()
	return scalar[string](t, tdb, `select coalesce((select state::text from public.kudo_uploads where id = $1), 'gone')`, id)
}

// createKudoWithImages sends a kudo carrying the given number of fresh PNG uploads.
func createKudoWithImages(t *testing.T, tdb *testkit.TestDatabase, sender, receiver uuid.UUID, n int) (uuid.UUID, []uuid.UUID, []string) {
	t.Helper()
	in := validInput(receiver)
	paths := make([]string, n)
	for i := range n {
		id, path := tdb.CreatePendingUpload(t, sender, upload.MimePNG, testkit.PNGBytes)
		in.ImageUploadIDs, paths[i] = append(in.ImageUploadIDs, id), path
	}
	kudoID, err := newCreateService(t, tdb, notification.NewService(tdb.App)).Create(context.Background(), sender, in)
	if err != nil {
		t.Fatal(err)
	}
	return kudoID, in.ImageUploadIDs, paths
}

// F005 SC-009 stale-prefill race (Codex N02): two prefills of K (images X, Y);
// cleanup paused; edit 1 drops X (X -> pending_delete, no kudo_images row);
// edit 2 from the stale prefill still keeps X -> 422 invalid_attachment and
// nothing of it is saved; resuming the cleanup deletes X (object, then row)
// while K's remaining image still renders.
func TestStalePrefillCannotKeepARemovedImage(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	tdb.HoldUploadPurgeLock(t) // the global purge must not remove X while the cleanup is paused
	store := newStore(t)
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID, ids, paths := createKudoWithImages(t, tdb, sender, receiver, 2)
	x, y := ids[0], ids[1]
	paused := &pausedCleaner{}
	edit := newUpdateService(t, tdb, paused)
	ctx := context.Background()
	first, err := edit.GetForEdit(ctx, sender, kudoID)
	if err != nil {
		t.Fatal(err)
	}
	stale, err := edit.GetForEdit(ctx, sender, kudoID)
	if err != nil {
		t.Fatal(err)
	}

	edit1 := asUpdate(first)
	edit1.Title, edit1.ImageUploadIDs = "Edit one", []uuid.UUID{y}
	if err := edit.Update(ctx, sender, kudoID, edit1); err != nil {
		t.Fatal(err)
	}
	if got := uploadState(t, tdb, x); got != "pending_delete" ||
		scalar[int](t, tdb, `select count(*) from public.kudo_images where upload_id = $1`, x) != 0 || len(paused.removed) != 1 {
		t.Fatalf("after edit 1: X is %s, paused cleanup holds %+v", got, paused.removed)
	}

	edit2 := asUpdate(stale)
	edit2.Title = "Edit two"
	if err := edit.Update(ctx, sender, kudoID, edit2); !errors.Is(err, upload.ErrInvalidAttachment) {
		t.Fatalf("edit 2 from the stale prefill: err = %v, want ErrInvalidAttachment", err)
	}
	if title := scalar[string](t, tdb, `select title from public.kudos where id = $1`, kudoID); title != "Edit one" ||
		uploadState(t, tdb, x) != "pending_delete" {
		t.Fatalf("edit 2 wrote something: title %q, X %s", title, uploadState(t, tdb, x))
	}

	upload.NewStorageCleaner(db.New(tdb.App), store).Cleanup(ctx, paused.removed) // resume
	if _, err := store.ObjectInfo(ctx, paths[0]); !errors.Is(err, upload.ErrObjectNotFound) || uploadState(t, tdb, x) != "gone" {
		t.Fatalf("resumed cleanup: X object err %v, row %s", err, uploadState(t, tdb, x))
	}
	card, err := kudo.NewReadService(db.New(tdb.App), store).Get(ctx, kudo.Viewer{ID: receiver}, kudoID)
	if err != nil || len(card.Images) != 1 || card.Images[0].URL == nil || uploadState(t, tdb, y) != "attached" {
		t.Fatalf("K after cleanup: %+v, %v (Y %s)", card.Images, err, uploadState(t, tdb, y))
	}
}

// F005 SC-009 purge (Codex R04, N02): the manual purge removes a pending upload
// older than 24 h (with or without an object) and a leftover pending_delete
// upload whose cleanup failed; a fresh pending upload and an old attached one
// are never touched.
func TestPurgeRemovesOnlyStaleUploads(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	tdb.HoldUploadPurgeLock(t)
	store := newStore(t)
	owner, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()

	stale, stalePath := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.PNGBytes)
	staleNoObject, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, nil)
	fresh, freshPath := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.PNGBytes)
	kudoID, ids, paths := createKudoWithImages(t, tdb, owner, receiver, 2)
	leftover, attached := ids[0], ids[1]
	edit := newUpdateService(t, tdb, &pausedCleaner{}) // a cleanup that never runs = a failed one
	form, err := edit.GetForEdit(ctx, owner, kudoID)
	if err != nil {
		t.Fatal(err)
	}
	keep := asUpdate(form)
	keep.ImageUploadIDs = []uuid.UUID{attached}
	if err := edit.Update(ctx, owner, kudoID, keep); err != nil {
		t.Fatal(err)
	}
	if _, err := tdb.Owner.Exec(ctx, `update public.kudo_uploads set created_at = now() - interval '25 hours'
		where id = any($1)`, []uuid.UUID{stale, staleNoObject, attached}); err != nil {
		t.Fatal(err)
	}

	dry, err := upload.PurgeStaleUploads(ctx, tdb.App, store, time.Now(), true) // S4: counts, deletes nothing
	if err != nil || dry.Candidates < 3 || dry.Purged != 0 || uploadState(t, tdb, stale) != "pending" || uploadState(t, tdb, leftover) != "pending_delete" {
		t.Fatalf("dry run = %+v, %v; stale %s, leftover %s", dry, err, uploadState(t, tdb, stale), uploadState(t, tdb, leftover))
	}
	result, err := upload.PurgeStaleUploads(ctx, tdb.App, store, time.Now(), false)
	if err != nil || result.Failed != 0 || result.Purged < 3 {
		t.Fatalf("purge = %+v, %v", result, err)
	}
	for id, want := range map[uuid.UUID]string{stale: "gone", staleNoObject: "gone", leftover: "gone", fresh: "pending", attached: "attached"} {
		if got := uploadState(t, tdb, id); got != want {
			t.Errorf("upload %s is %s after the purge, want %s", id, got, want)
		}
	}
	for path, wantGone := range map[string]bool{stalePath: true, paths[0]: true, freshPath: false, paths[1]: false} {
		_, err := store.ObjectInfo(ctx, path)
		if gone := errors.Is(err, upload.ErrObjectNotFound); gone != wantGone {
			t.Errorf("object %s gone = %v (err %v), want %v", path, gone, err, wantGone)
		}
	}
}

// failingDeleteStore is the real Storage client except that deleting fails.
type failingDeleteStore struct{ upload.ObjectStore }

func (failingDeleteStore) DeleteObject(context.Context, string) error {
	return errors.New("storage is down")
}

// Reviewer N1 / W2: the purge only marks the row pending_delete under its lock,
// then deletes the object and the row after commit. When Storage fails the row
// stays pending_delete (and its object stays), so the next run retries it and no
// object is ever left without a row.
func TestPurgeLeavesTheUploadPendingDeleteWhenStorageFails(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	tdb.HoldUploadPurgeLock(t)
	store := newStore(t)
	owner := tdb.CreateSunner(t, testkit.SunnerSpec{})
	stale, path := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.PNGBytes)
	ctx := context.Background()
	if _, err := tdb.Owner.Exec(ctx, `update public.kudo_uploads set created_at = now() - interval '25 hours' where id = $1`, stale); err != nil {
		t.Fatal(err)
	}

	failed, err := upload.PurgeStaleUploads(ctx, tdb.App, failingDeleteStore{store}, time.Now(), false)
	if err != nil || failed.Failed < 1 || uploadState(t, tdb, stale) != "pending_delete" {
		t.Fatalf("purge with failing Storage = %+v, %v; upload %s, want the failure counted and the row pending_delete",
			failed, err, uploadState(t, tdb, stale))
	}
	if _, err := store.ObjectInfo(ctx, path); err != nil {
		t.Fatalf("object should still be there after the failed delete: %v", err)
	}

	retried, err := upload.PurgeStaleUploads(ctx, tdb.App, store, time.Now(), false)
	if _, objectErr := store.ObjectInfo(ctx, path); err != nil || retried.Failed != 0 || uploadState(t, tdb, stale) != "gone" ||
		!errors.Is(objectErr, upload.ErrObjectNotFound) {
		t.Fatalf("retry = %+v, %v; upload %s, object err %v; want both gone", retried, err, uploadState(t, tdb, stale), objectErr)
	}
}
