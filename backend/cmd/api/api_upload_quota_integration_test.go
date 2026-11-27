//go:build integration

package main

import (
	"context"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// Reviewer W2: a Sunner may hold at most upload.PendingUploadQuota pending
// uploads created in the last 24 h. Older pending rows and attached ones do not
// count; over the cap the endpoint answers 429 upload_quota_exceeded and
// writes nothing.
func TestUploadURLsAreCappedPerOwner(t *testing.T) {
	h := newAPIHarness(t)
	owner, token := h.sunner(testkit.SunnerSpec{})
	receiver, _ := h.sunner(testkit.SunnerSpec{})
	attachedTo := h.db.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: receiver})
	ctx := context.Background()
	insert := func(n int, age string, attached bool) {
		t.Helper()
		for range n {
			var kudoID *uuid.UUID
			state := "pending"
			if attached {
				kudoID, state = &attachedTo, "attached"
			}
			if _, err := h.db.Owner.Exec(ctx, `insert into public.kudo_uploads
				(owner_id, object_path, mime, size_bytes, created_at, state, kudo_id, attached_at)
				values ($1, 'kudo-images/' || gen_random_uuid() || '.png', 'image/png', 10, now() - $2::interval,
				$3::kudo_upload_state, $4, case when $4::uuid is null then null else now() end)`,
				owner, age, state, kudoID); err != nil {
				t.Fatal(err)
			}
		}
	}
	insert(upload.PendingUploadQuota-1, "1 hour", false)
	insert(3, "25 hours", false) // stale pending rows: a purge job's concern, not the quota
	insert(3, "1 hour", true)    // attached uploads never count

	body := map[string]any{"contentType": "image/png", "size": len(testkit.PNGBytes)}
	if got := h.do(http.MethodPost, "/api/v1/uploads/kudo-images", token, body); got.Status != http.StatusCreated {
		t.Fatalf("upload URL at %d recent pending = %d %s, want 201", upload.PendingUploadQuota-1, got.Status, got.Body)
	}
	got := h.do(http.MethodPost, "/api/v1/uploads/kudo-images", token, body)
	if got.Status != http.StatusTooManyRequests || got.errorCode(t) != "upload_quota_exceeded" {
		t.Fatalf("upload URL over the quota = %d %s, want 429 upload_quota_exceeded", got.Status, got.Body)
	}
	var pending int
	if err := h.db.Owner.QueryRow(ctx, `select count(*) from public.kudo_uploads
		where owner_id = $1 and state = 'pending' and created_at > now() - interval '24 hours'`, owner).Scan(&pending); err != nil {
		t.Fatal(err)
	}
	if pending != upload.PendingUploadQuota {
		t.Fatalf("recent pending uploads = %d, want %d (the refused request wrote nothing)", pending, upload.PendingUploadQuota)
	}
	// The quota is per owner: another Sunner is unaffected.
	_, other := h.sunner(testkit.SunnerSpec{})
	if got := h.do(http.MethodPost, "/api/v1/uploads/kudo-images", other, body); got.Status != http.StatusCreated {
		t.Fatalf("another Sunner's upload URL = %d %s, want 201", got.Status, got.Body)
	}
}
