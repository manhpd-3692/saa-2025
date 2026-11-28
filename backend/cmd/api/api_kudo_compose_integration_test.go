//go:build integration

package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

func (h *apiHarness) scalar(sql string, args ...any) string {
	h.t.Helper()
	var v string
	if err := h.db.Owner.QueryRow(context.Background(), sql, args...).Scan(&v); err != nil {
		h.t.Fatalf("%s: %v", sql, err)
	}
	return v
}

// createKudo sends a named kudo through the router and returns its id.
func (h *apiHarness) createKudo(token string, receiver uuid.UUID, hashtag string, uploadIDs ...string) string {
	h.t.Helper()
	if uploadIDs == nil {
		uploadIDs = []string{}
	}
	created := h.do(http.MethodPost, "/api/v1/kudos", token, map[string]any{
		"receiverId": receiver, "title": "Compose", "contentHtml": "<p>Thanks!</p>", "hashtags": []string{hashtag},
		"imageUploadIds": uploadIDs,
	})
	id, _ := created.json(h.t)["kudoId"].(string)
	if created.Status != http.StatusCreated || id == "" {
		h.t.Fatalf("create kudo = %d %s", created.Status, created.Body)
	}
	return id
}

// uploadImage signs an upload URL and uploads a PNG the way the browser does.
func (h *apiHarness) uploadImage(token string) (id, objectPath string) {
	h.t.Helper()
	signed := h.do(http.MethodPost, "/api/v1/uploads/kudo-images", token, map[string]any{"contentType": "image/png", "size": len(testkit.PNGBytes)})
	body := signed.json(h.t)
	id, _ = body["uploadId"].(string)
	url, _ := body["uploadUrl"].(string)
	objectPath = h.scalar(`select object_path from public.kudo_uploads where id = $1`, id)
	testkit.DeleteObjectsAtCleanup(h.t, objectPath)
	if status := testkit.PutSignedUpload(h.t, url, "image/png", testkit.PNGBytes); status != http.StatusOK {
		h.t.Fatalf("browser upload = %d", status)
	}
	return id, objectPath
}

// F005 A2 + A3 through the router: search matches name fragments without
// offering the caller (BR-001) and treats LIKE wildcards literally; the
// hashtag list finds a tag by a "#Prefix" in any case (BR-002).
func TestRecipientSearchAndHashtagList(t *testing.T) {
	h := newAPIHarness(t)
	marker := "Zq" + uuid.NewString()[:6]
	_, senderToken := h.sunner(testkit.SunnerSpec{Name: "Sender " + marker})
	receiver, _ := h.sunner(testkit.SunnerSpec{Name: "Receiver " + marker})

	found := h.do(http.MethodGet, "/api/v1/users/search?q="+strings.ToLower(marker), senderToken, nil)
	if found.Status != http.StatusOK || strings.Count(string(found.Body), `"id"`) != 1 ||
		!strings.Contains(string(found.Body), receiver.String()) || !strings.Contains(string(found.Body), `"unitCode"`) {
		t.Fatalf("search = %d %s, want only the receiver", found.Status, found.Body)
	}
	if got := h.do(http.MethodGet, "/api/v1/users/search?q=%25%25"+marker, senderToken, nil); got.Status != http.StatusOK || string(got.Body) != "[]\n" {
		t.Fatalf("wildcard search = %d %q, want an empty list", got.Status, got.Body)
	}

	tag := "zcompose" + strings.ToLower(uuid.NewString()[:6])
	h.createKudo(senderToken, receiver, tag)
	tags := h.do(http.MethodGet, "/api/v1/hashtags?q=%23"+strings.ToUpper(tag[:9]), senderToken, nil)
	if tags.Status != http.StatusOK || !strings.Contains(string(tags.Body), `"name":"`+tag+`"`) {
		t.Fatalf("hashtags = %d %s, want %s", tags.Status, tags.Body, tag)
	}
}

// F005 SC-003 through the router (FR-601, FR-602, BR-006): no token, a
// non-author, a spam kudo and a bad id write nothing; the author's save
// ignores a receiverId in the body (D004).
func TestKudoEditThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	sender, senderToken := h.sunner(testkit.SunnerSpec{})
	receiver, _ := h.sunner(testkit.SunnerSpec{Name: "Locked Receiver"})
	other, otherToken := h.sunner(testkit.SunnerSpec{})
	kudoID := h.createKudo(senderToken, receiver, "editflow")
	spam := h.db.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Spam: true}).String()
	snapshot := func(id string) string {
		return h.scalar(`select title || '|' || receiver_id || '|' || updated_at::text from public.kudos where id = $1`, id)
	}
	before, beforeSpam := snapshot(kudoID), snapshot(spam)
	body := map[string]any{"title": "Changed", "contentHtml": "<p>Changed</p>", "hashtags": []string{"changed"}, "imageUploadIds": []string{}}

	refusals := []struct {
		method, path, token string
		want                int
		code                string
	}{
		{http.MethodGet, "/api/v1/kudos/" + kudoID + "/edit", "", http.StatusUnauthorized, "unauthorized"},
		{http.MethodPatch, "/api/v1/kudos/" + kudoID, "", http.StatusUnauthorized, "unauthorized"},
		{http.MethodGet, "/api/v1/kudos/" + kudoID + "/edit", otherToken, http.StatusForbidden, "not_kudo_author"},
		{http.MethodPatch, "/api/v1/kudos/" + kudoID, otherToken, http.StatusForbidden, "not_kudo_author"},
		{http.MethodGet, "/api/v1/kudos/" + spam + "/edit", senderToken, http.StatusConflict, "kudo_spam_locked"},
		{http.MethodPatch, "/api/v1/kudos/" + spam, senderToken, http.StatusConflict, "kudo_spam_locked"},
		{http.MethodPatch, "/api/v1/kudos/" + spam, otherToken, http.StatusNotFound, "kudo_not_found"},
		{http.MethodPatch, "/api/v1/kudos/not-a-uuid", senderToken, http.StatusNotFound, "kudo_not_found"},
	}
	for _, tc := range refusals {
		if got := h.do(tc.method, tc.path, tc.token, body); got.Status != tc.want || got.errorCode(t) != tc.code {
			t.Errorf("%s %s: %d %s, want %d %s", tc.method, tc.path, got.Status, got.Body, tc.want, tc.code)
		}
	}
	invalid := h.do(http.MethodPatch, "/api/v1/kudos/"+kudoID, senderToken, map[string]any{"title": "", "contentHtml": "", "hashtags": []string{}})
	if invalid.Status != http.StatusUnprocessableEntity || strings.Count(string(invalid.Body), `"field"`) != 3 {
		t.Errorf("invalid edit = %d %s, want 3 field errors", invalid.Status, invalid.Body)
	}
	if snapshot(kudoID) != before || snapshot(spam) != beforeSpam {
		t.Fatalf("refused calls wrote: %q -> %q, %q -> %q", before, snapshot(kudoID), beforeSpam, snapshot(spam))
	}

	form := h.do(http.MethodGet, "/api/v1/kudos/"+kudoID+"/edit", senderToken, nil)
	if form.Status != http.StatusOK || form.json(t)["receiver"].(map[string]any)["name"] != "Locked Receiver" {
		t.Fatalf("prefill = %d %s", form.Status, form.Body)
	}
	body["receiverId"] = other
	if got := h.do(http.MethodPatch, "/api/v1/kudos/"+kudoID, senderToken, body); got.Status != http.StatusOK {
		t.Fatalf("author edit = %d %s", got.Status, got.Body)
	}
	if got := h.scalar(`select title || '|' || receiver_id from public.kudos where id = $1`, kudoID); got != "Changed|"+receiver.String() {
		t.Fatalf("after edit = %q, want the new title and the same receiver", got)
	}
}

// F005 SC-009 A8 through the router (BR-007, Codex R04, N02): own pending ->
// 204 with object and row gone; never-uploaded pending -> 204; foreign or
// unknown -> 404; attached or pending_delete -> 409.
func TestDeleteUploadThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	h.db.HoldUploadPurgeLock(t) // keeps the pending_delete fixture away from the purge test
	_, ownerToken := h.sunner(testkit.SunnerSpec{})
	receiver, otherToken := h.sunner(testkit.SunnerSpec{})

	pending, pendingPath := h.uploadImage(ownerToken)
	if got := h.do(http.MethodDelete, "/api/v1/uploads/"+pending, otherToken, nil); got.Status != http.StatusNotFound ||
		got.errorCode(t) != "upload_not_found" {
		t.Fatalf("foreign delete = %d %s", got.Status, got.Body)
	}
	if got := h.do(http.MethodDelete, "/api/v1/uploads/"+pending, ownerToken, nil); got.Status != http.StatusNoContent {
		t.Fatalf("own pending delete = %d %s", got.Status, got.Body)
	}
	if n := h.scalar(`select count(*)::text from public.kudo_uploads where id = $1`, pending); n != "0" {
		t.Fatalf("deleted upload row still exists")
	}
	store, err := upload.NewStorageObjectStore(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY"))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := store.ObjectInfo(context.Background(), pendingPath); !errors.Is(err, upload.ErrObjectNotFound) {
		t.Fatalf("deleted upload object still in Storage: %v", err)
	}
	signed := h.do(http.MethodPost, "/api/v1/uploads/kudo-images", ownerToken, map[string]any{"contentType": "image/png", "size": 10})
	neverUploaded, _ := signed.json(t)["uploadId"].(string)
	for path, want := range map[string]int{
		"/api/v1/uploads/" + neverUploaded:    http.StatusNoContent,
		"/api/v1/uploads/" + pending:          http.StatusNotFound,
		"/api/v1/uploads/" + uuid.NewString(): http.StatusNotFound,
		"/api/v1/uploads/not-a-uuid":          http.StatusNotFound,
	} {
		if got := h.do(http.MethodDelete, path, ownerToken, nil); got.Status != want {
			t.Errorf("DELETE %s = %d %s, want %d", path, got.Status, got.Body, want)
		}
	}

	attached, _ := h.uploadImage(ownerToken)
	pendingDelete, _ := h.uploadImage(ownerToken)
	kudoID := h.createKudo(ownerToken, receiver, "deleteflow", attached, pendingDelete)
	// As an edit leaves a removed attachment: no kudo_images row, state pending_delete (N02).
	if _, err := h.db.Owner.Exec(context.Background(), `delete from public.kudo_images where upload_id = $1`, pendingDelete); err != nil {
		t.Fatal(err)
	}
	if _, err := h.db.Owner.Exec(context.Background(), `update public.kudo_uploads set state = 'pending_delete'
		where id = $1 and kudo_id = $2`, pendingDelete, kudoID); err != nil {
		t.Fatal(err)
	}
	// An unsaved upload a DELETE already claimed but whose object delete failed (reviewer N1):
	// it stays pending_delete, a second DELETE answers 409, and the purge removes it.
	leftover, leftoverPath := h.uploadImage(ownerToken)
	if _, err := h.db.Owner.Exec(context.Background(), `update public.kudo_uploads set state = 'pending_delete'
		where id = $1 and kudo_id is null`, leftover); err != nil {
		t.Fatal(err)
	}
	for _, id := range []string{attached, pendingDelete, leftover} {
		if got := h.do(http.MethodDelete, "/api/v1/uploads/"+id, ownerToken, nil); got.Status != http.StatusConflict ||
			got.errorCode(t) != "upload_attached" {
			t.Errorf("DELETE committed upload %s = %d %s, want 409 upload_attached", id, got.Status, got.Body)
		}
	}
	if result, err := upload.PurgeStaleUploads(context.Background(), h.db.App, store, time.Now(), false); err != nil || result.Failed != 0 {
		t.Fatalf("purge = %+v, %v", result, err)
	}
	left := h.scalar(`select count(*)::text from public.kudo_uploads where id = $1`, leftover)
	if _, err := store.ObjectInfo(context.Background(), leftoverPath); left != "0" || !errors.Is(err, upload.ErrObjectNotFound) {
		t.Fatalf("after the purge: %s rows, object err %v; want both gone", left, err)
	}
}
