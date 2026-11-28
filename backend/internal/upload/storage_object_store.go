package upload

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Bucket is the private kudo image bucket (5 MB, JPEG/PNG/WebP; Codex R03).
const Bucket = "kudo-images"

// Storage failures the callers distinguish.
var (
	ErrObjectNotFound     = errors.New("storage object not found")
	ErrStorageUnavailable = errors.New("storage is not configured")
)

// SignedUpload is a write-once signed upload target (no upsert, Codex R03).
type SignedUpload struct {
	URL   string
	Token string
}

// ObjectInfo is the stored object's metadata as Storage reports it.
type ObjectInfo struct {
	Size        int64
	ContentType string
}

// ObjectStore is the Supabase Storage surface Go needs. Object paths are
// `kudo-images/{uploadId}.{ext}`: bucket, then an opaque object name (R01).
type ObjectStore interface {
	CreateSignedUploadURL(ctx context.Context, objectPath string) (SignedUpload, error)
	ObjectInfo(ctx context.Context, objectPath string) (ObjectInfo, error)
	ReadPrefix(ctx context.Context, objectPath string, n int) ([]byte, error)
	// SignReadURLs returns object path -> signed URL; a path that cannot be
	// signed is absent from the map (F006 INT-001: the card shows a placeholder).
	SignReadURLs(ctx context.Context, objectPaths []string, ttl time.Duration) (map[string]string, error)
	// DeleteObject removes one object; a missing object answers ErrObjectNotFound
	// (callers deleting an upload treat that as already gone, Codex R04).
	DeleteObject(ctx context.Context, objectPath string) error
}

// storageRequestTimeout bounds one Storage call made while serving a request.
const storageRequestTimeout = 10 * time.Second

// StorageObjectStore talks to Supabase Storage with the service key, which
// lives only in the Go env (Codex R21).
type StorageObjectStore struct {
	baseURL    string // ${SUPABASE_URL}/storage/v1
	serviceKey string
	client     *http.Client
}

// NewStorageObjectStore refuses to start without the Storage service key, so
// uploads fail loudly at boot instead of on the first request (phase-01 carry-over).
func NewStorageObjectStore(supabaseURL, serviceKey string) (*StorageObjectStore, error) {
	supabaseURL = strings.TrimRight(strings.TrimSpace(supabaseURL), "/")
	serviceKey = strings.TrimSpace(serviceKey)
	if supabaseURL == "" || serviceKey == "" {
		return nil, errors.New("upload: SUPABASE_URL and SUPABASE_SERVICE_KEY are required for kudo image storage")
	}
	return &StorageObjectStore{
		baseURL:    supabaseURL + "/storage/v1",
		serviceKey: serviceKey,
		client:     &http.Client{Timeout: storageRequestTimeout},
	}, nil
}

// ObjectPath builds the opaque key `kudo-images/{name}`.
func ObjectPath(name string) string { return Bucket + "/" + name }

// objectName strips the bucket from an object path, refusing other buckets.
func objectName(objectPath string) (string, error) {
	name, ok := strings.CutPrefix(objectPath, Bucket+"/")
	if !ok || name == "" || strings.Contains(name, "/") {
		return "", fmt.Errorf("upload: object path %q is not in bucket %s", objectPath, Bucket)
	}
	return name, nil
}

// UnavailableObjectStore answers ErrStorageUnavailable when the service key is
// missing: the API still boots, uploads fail closed with 503.
type UnavailableObjectStore struct{}

var (
	_ ObjectStore = (*StorageObjectStore)(nil)
	_ ObjectStore = UnavailableObjectStore{}
)

func (UnavailableObjectStore) CreateSignedUploadURL(context.Context, string) (SignedUpload, error) {
	return SignedUpload{}, ErrStorageUnavailable
}

func (UnavailableObjectStore) ObjectInfo(context.Context, string) (ObjectInfo, error) {
	return ObjectInfo{}, ErrStorageUnavailable
}

func (UnavailableObjectStore) ReadPrefix(context.Context, string, int) ([]byte, error) {
	return nil, ErrStorageUnavailable
}

func (UnavailableObjectStore) SignReadURLs(context.Context, []string, time.Duration) (map[string]string, error) {
	return nil, ErrStorageUnavailable
}

func (UnavailableObjectStore) DeleteObject(context.Context, string) error {
	return ErrStorageUnavailable
}
