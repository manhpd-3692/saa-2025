package upload

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// The Storage client maps Supabase's answers: a missing object is 404 or a
// 400 whose body says statusCode "404"; other failures stay errors.
func TestStorageObjectStoreErrorMapping(t *testing.T) {
	cases := map[string]struct {
		status   int
		body     string
		notFound bool
	}{
		"http 404":                {404, `{}`, true},
		"400 with statusCode 404": {400, `{"statusCode":"404","error":"not_found"}`, true},
		"500":                     {500, `{"statusCode":"500"}`, false},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("apikey") != "key" || r.Header.Get("Authorization") != "Bearer key" {
					t.Errorf("service key headers missing: %v", r.Header)
				}
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			store, err := NewStorageObjectStore(server.URL, "key")
			if err != nil {
				t.Fatal(err)
			}
			_, err = store.ObjectInfo(context.Background(), ObjectPath("a.png"))
			if err == nil || errors.Is(err, ErrObjectNotFound) != tc.notFound {
				t.Fatalf("err = %v, want not-found %v", err, tc.notFound)
			}
		})
	}
}

func TestStorageObjectStoreRefusesForeignPathsAndMissingKey(t *testing.T) {
	if _, err := NewStorageObjectStore("http://127.0.0.1:54321", ""); err == nil {
		t.Fatal("store built without a service key")
	}
	store, err := NewStorageObjectStore("http://127.0.0.1:1", "key")
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range []string{"other-bucket/a.png", "kudo-images/", "kudo-images/a/b.png", "a.png"} {
		if _, err := store.ObjectInfo(context.Background(), p); err == nil {
			t.Errorf("object path %q accepted", p)
		}
	}
	if urls, err := store.SignReadURLs(context.Background(), nil, time.Minute); err != nil || len(urls) != 0 {
		t.Fatalf("signing nothing = %v, %v", urls, err)
	}
	if _, err := (UnavailableObjectStore{}).CreateSignedUploadURL(context.Background(), "x"); !errors.Is(err, ErrStorageUnavailable) {
		t.Fatalf("unavailable store err = %v", err)
	}
}
