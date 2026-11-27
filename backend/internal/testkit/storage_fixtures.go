//go:build integration

package testkit

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

// Minimal real image heads (magic numbers) for attachment tests.
var (
	PNGBytes  = append([]byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}, bytes.Repeat([]byte{0}, 64)...)
	JPEGBytes = append([]byte{0xFF, 0xD8, 0xFF, 0xE0}, bytes.Repeat([]byte{0}, 64)...)
)

func storageEnv(t testing.TB) (baseURL, key string) {
	t.Helper()
	base := strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/")
	key = strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_KEY"))
	if base == "" || key == "" {
		t.Fatal("testkit: SUPABASE_URL and SUPABASE_SERVICE_KEY are required for storage tests (backend/README.md)")
	}
	return base + "/storage/v1", key
}

func storageRequest(t testing.TB, method, url, contentType string, body []byte, withKey bool) (int, string) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	if withKey {
		_, key := storageEnv(t)
		req.Header.Set("apikey", key)
		req.Header.Set("Authorization", "Bearer "+key)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("testkit: storage %s: %v", method, err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(raw)
}

// StoreObject writes an object as the service role (as a browser upload would
// have) and deletes it when the test ends. objectPath is `kudo-images/{name}`.
func StoreObject(t testing.TB, objectPath, contentType string, body []byte) {
	t.Helper()
	base, _ := storageEnv(t)
	if status, msg := storageRequest(t, http.MethodPost, base+"/object/"+objectPath, contentType, body, true); status != http.StatusOK {
		t.Fatalf("testkit: store %s: %d %s", objectPath, status, msg)
	}
	DeleteObjectsAtCleanup(t, objectPath)
}

// PutSignedUpload uploads through a signed upload URL like the browser does
// (no service key) and returns the Storage status.
func PutSignedUpload(t testing.TB, uploadURL, contentType string, body []byte) int {
	t.Helper()
	status, _ := storageRequest(t, http.MethodPut, uploadURL, contentType, body, false)
	return status
}

// DeleteObjectsAtCleanup removes objects (bucket-qualified paths) after the test.
func DeleteObjectsAtCleanup(t testing.TB, objectPaths ...string) {
	t.Helper()
	t.Cleanup(func() {
		base, _ := storageEnv(t)
		names := make([]string, 0, len(objectPaths))
		for _, p := range objectPaths {
			names = append(names, strings.TrimPrefix(p, "kudo-images/"))
		}
		body, _ := json.Marshal(map[string][]string{"prefixes": names})
		if status, msg := storageRequest(t, http.MethodDelete, base+"/object/kudo-images", "application/json", body, true); status != http.StatusOK {
			t.Errorf("testkit: delete objects %v: %d %s", objectPaths, status, msg)
		}
	})
}

// CreatePendingUpload inserts a pending kudo_uploads row (as A4 does) for an
// opaque key; with a non-nil body the object is stored too.
func (d *TestDatabase) CreatePendingUpload(t testing.TB, owner uuid.UUID, contentType string, body []byte) (uuid.UUID, string) {
	t.Helper()
	id := uuid.New()
	ext := map[string]string{"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[contentType]
	if ext == "" {
		ext = "png"
	}
	objectPath := "kudo-images/" + id.String() + "." + ext
	if _, err := d.Owner.Exec(context.Background(), `insert into public.kudo_uploads (id, owner_id, object_path, mime, size_bytes)
		values ($1, $2, $3, $4, $5)`, id, owner, objectPath, contentType, len(body)); err != nil {
		t.Fatalf("testkit: create upload: %v", err)
	}
	if body != nil {
		StoreObject(t, objectPath, contentType, body)
	}
	return id, objectPath
}
