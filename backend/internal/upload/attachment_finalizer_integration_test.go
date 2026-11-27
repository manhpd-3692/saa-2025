//go:build integration

package upload_test

import (
	"context"
	"errors"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

func realStore(t *testing.T) *upload.StorageObjectStore {
	t.Helper()
	store, err := upload.NewStorageObjectStore(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY"))
	if err != nil {
		t.Fatal(err)
	}
	return store
}

// F005 SC-005 (BR-003, BR-007; Codex R03, N02) against the real local Storage.
func TestInspectChecksTheRealStoredObjects(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	finalizer := upload.NewAttachmentFinalizer(realStore(t))
	queries := db.New(tdb.App)
	owner, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()

	png, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.PNGBytes)
	jpeg, _ := tdb.CreatePendingUpload(t, owner, upload.MimeJPEG, testkit.JPEGBytes)
	got, err := finalizer.Inspect(ctx, queries, owner, []uuid.UUID{png, jpeg})
	if err != nil || len(got) != 2 || got[0].Mime != upload.MimePNG || got[0].Size != int64(len(testkit.PNGBytes)) ||
		got[1].Mime != upload.MimeJPEG {
		t.Fatalf("Inspect(real png, real jpeg) = %+v, %v", got, err)
	}

	lyingType, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.JPEGBytes)
	notImage, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, []byte("plain text pretending to be a PNG"))
	missing, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, nil)
	foreign, _ := tdb.CreatePendingUpload(t, other, upload.MimePNG, testkit.PNGBytes)
	attached, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.PNGBytes)
	pendingDelete, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.PNGBytes)
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: other})
	for id, state := range map[uuid.UUID]string{attached: "attached", pendingDelete: "pending_delete"} {
		if _, err := tdb.Owner.Exec(ctx, `update public.kudo_uploads set state = $2::kudo_upload_state, kudo_id = $3,
			attached_at = now() where id = $1`, id, state, kudoID); err != nil {
			t.Fatal(err)
		}
	}
	six := []uuid.UUID{png, jpeg, uuid.New(), uuid.New(), uuid.New(), uuid.New()}
	refused := map[string][]uuid.UUID{
		"lying content type": {lyingType}, "not an image": {notImage}, "no stored object": {missing},
		"another user's upload": {foreign}, "already attached": {attached}, "pending_delete": {pendingDelete},
		"unknown upload id": {uuid.New()}, "six images": six, "duplicate ids": {png, png},
	}
	for name, ids := range refused {
		if _, err := finalizer.Inspect(ctx, queries, owner, ids); !errors.Is(err, upload.ErrInvalidAttachment) {
			t.Errorf("%s: err = %v, want ErrInvalidAttachment", name, err)
		}
	}
}

// A4 + INT-001: a signed upload URL works once from the browser side and a
// second upload to the same key (replace attempt) is refused (no upsert, R03).
func TestSignedUploadIsWriteOnce(t *testing.T) {
	store := realStore(t)
	objectPath := upload.ObjectPath(uuid.NewString() + ".png")
	signed, err := store.CreateSignedUploadURL(context.Background(), objectPath)
	if err != nil {
		t.Fatal(err)
	}
	testkit.DeleteObjectsAtCleanup(t, objectPath)
	if status := testkit.PutSignedUpload(t, signed.URL, upload.MimePNG, testkit.PNGBytes); status != http.StatusOK {
		t.Fatalf("first upload status %d, want 200", status)
	}
	if status := testkit.PutSignedUpload(t, signed.URL, upload.MimePNG, testkit.JPEGBytes); status < 400 {
		t.Fatalf("replace attempt status %d, want refused", status)
	}
	head, err := store.ReadPrefix(context.Background(), objectPath, upload.SniffBytes)
	if err != nil || string(head[:4]) != string(testkit.PNGBytes[:4]) {
		t.Fatalf("stored object changed after the replace attempt: %x, %v", head, err)
	}

	urls, err := store.SignReadURLs(context.Background(), []string{objectPath, upload.ObjectPath("missing.png")}, time.Minute)
	if err != nil || !strings.Contains(urls[objectPath], "/object/sign/"+objectPath) || len(urls) != 1 {
		t.Fatalf("SignReadURLs = %v, %v; want only the existing object signed", urls, err)
	}
}

// BR-007: Attach moves pending -> attached once, under row locks; a second
// attach of the same upload (another kudo) is refused.
func TestAttachIsSetOnce(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	finalizer := upload.NewAttachmentFinalizer(realStore(t))
	owner, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	uploadID, _ := tdb.CreatePendingUpload(t, owner, upload.MimePNG, testkit.PNGBytes)
	inspected, err := finalizer.Inspect(context.Background(), db.New(tdb.App), owner, []uuid.UUID{uploadID})
	if err != nil {
		t.Fatal(err)
	}
	attach := func(kudoID uuid.UUID) error {
		return pgx.BeginFunc(context.Background(), tdb.App, func(tx pgx.Tx) error {
			return finalizer.Attach(context.Background(), db.New(tx), owner, kudoID, inspected)
		})
	}
	first := tdb.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: other})
	if err := attach(first); err != nil {
		t.Fatal(err)
	}
	second := tdb.CreateKudo(t, testkit.KudoSpec{Sender: owner, Receiver: other})
	if err := attach(second); !errors.Is(err, upload.ErrInvalidAttachment) {
		t.Fatalf("second attach err = %v, want ErrInvalidAttachment", err)
	}
	var state string
	var kudoID uuid.UUID
	if err := tdb.Owner.QueryRow(context.Background(), `select state::text, kudo_id from public.kudo_uploads where id = $1`,
		uploadID).Scan(&state, &kudoID); err != nil || state != "attached" || kudoID != first {
		t.Fatalf("upload = %s on %s (%v), want attached to the first kudo", state, kudoID, err)
	}
}
