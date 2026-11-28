//go:build integration

package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// Reviewer W6 (b), F005 BR-007 / Codex R04: DELETE of an unsaved upload and a
// create attaching the same upload serialize on the upload row. Whichever is
// granted the row first wins outright: create first → kudo saved with the
// image, DELETE answers 409 and the object stays; DELETE first → row and object
// gone, the create answers 422 invalid_attachment and saves no kudo.
func TestDeleteUploadRacingAnAttachingCreate(t *testing.T) {
	h := newAPIHarness(t)
	sender, token := h.sunner(testkit.SunnerSpec{})
	receiver, _ := h.sunner(testkit.SunnerSpec{})
	store, err := upload.NewStorageObjectStore(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY"))
	if err != nil {
		t.Fatal(err)
	}

	for _, createFirst := range []bool{true, false} {
		uploadID, objectPath := h.uploadImage(token)
		var created, deleted apiResponse
		createFn := func() {
			created = h.do(http.MethodPost, "/api/v1/kudos", token, map[string]any{
				"receiverId": receiver, "title": "Race", "contentHtml": "<p>Race</p>", "hashtags": []string{"race"},
				"imageUploadIds": []string{uploadID},
			})
		}
		deleteFn := func() { deleted = h.do(http.MethodDelete, "/api/v1/uploads/"+uploadID, token, nil) }
		order := []func(){createFn, deleteFn}
		if !createFirst {
			order = []func(){deleteFn, createFn}
		}

		barrier := h.db.HoldRowLock(t, `select id from public.kudo_uploads where id = $1 for update`, uploadID)
		var wg sync.WaitGroup
		for i, fn := range order {
			wg.Add(1)
			go func() {
				defer wg.Done()
				fn()
			}()
			barrier.WaitForWaiters(t, i+1) // queue in this order behind the held upload row
		}
		barrier.Release(t)
		waitOrFail(t, &wg)

		kudos := h.scalar(`select count(*)::text from public.kudos where sender_id = $1 and title = 'Race'`, sender)
		state := h.scalar(`select coalesce((select state::text from public.kudo_uploads where id = $1), 'gone')`, uploadID)
		_, objectErr := store.ObjectInfo(context.Background(), objectPath)
		if createFirst {
			if created.Status != http.StatusCreated || deleted.Status != http.StatusConflict || state != "attached" || objectErr != nil || kudos != "1" {
				t.Fatalf("create first: create %d, delete %d %s, upload %s, object err %v, kudos %s",
					created.Status, deleted.Status, deleted.Body, state, objectErr, kudos)
			}
		} else if deleted.Status != http.StatusNoContent || created.Status != http.StatusUnprocessableEntity ||
			created.errorCode(t) != "invalid_attachment" || state != "gone" || !errors.Is(objectErr, upload.ErrObjectNotFound) || kudos != "1" {
			t.Fatalf("delete first: delete %d, create %d %s, upload %s, object err %v, kudos %s (want still 1)",
				deleted.Status, created.Status, created.Body, state, objectErr, kudos)
		}
	}
}

func waitOrFail(t *testing.T, wg *sync.WaitGroup) {
	t.Helper()
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatal("queued requests did not finish after the release (deadlock?)")
	}
}
