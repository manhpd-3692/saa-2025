package auth_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
)

// The identity reader (gap log C08) trusts only a JSON `true` email_verified on
// the Google identity and sends the service key on every lookup.
func TestSupabaseIdentityReaderParsesTheGoogleIdentity(t *testing.T) {
	userID := uuid.New()
	responses := map[string]struct {
		status int
		body   string
		want   auth.GoogleIdentity
		err    error
	}{
		"verified google": {200, `{"identities":[{"provider":"email","identity_data":{"email":"x@sun-asterisk.com","email_verified":true}},
			{"provider":"google","identity_data":{"email":"An.Nguyen@Sun-Asterisk.com","email_verified":true,"full_name":"An","picture":"https://p/a.png"}}]}`,
			auth.GoogleIdentity{Email: "an.nguyen@sun-asterisk.com", EmailVerified: true, Name: "An", AvatarURL: "https://p/a.png"}, nil},
		"string true is not verified": {200, `{"identities":[{"provider":"google","identity_data":{"email":"a@sun-asterisk.com","email_verified":"true"}}]}`,
			auth.GoogleIdentity{Email: "a@sun-asterisk.com"}, nil},
		"no google identity": {200, `{"identities":[{"provider":"github","identity_data":{"email_verified":true}}]}`, auth.GoogleIdentity{}, auth.ErrNoGoogleIdentity},
		"identities null":    {200, `{"identities":null}`, auth.GoogleIdentity{}, auth.ErrNoGoogleIdentity},
		"unknown user":       {404, `{"code":404}`, auth.GoogleIdentity{}, auth.ErrNoGoogleIdentity},
	}
	for name, tc := range responses {
		t.Run(name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.URL.Path != "/auth/v1/admin/users/"+userID.String() || r.Header.Get("apikey") != "secret" ||
					r.Header.Get("Authorization") != "Bearer secret" {
					t.Errorf("request %s with headers %v", r.URL.Path, r.Header)
				}
				w.WriteHeader(tc.status)
				_, _ = w.Write([]byte(tc.body))
			}))
			defer server.Close()
			reader, err := auth.NewSupabaseIdentityReader(server.URL, "secret")
			if err != nil {
				t.Fatal(err)
			}
			got, err := reader.GoogleIdentity(context.Background(), userID)
			if !errors.Is(err, tc.err) || got != tc.want {
				t.Fatalf("GoogleIdentity = %+v, %v; want %+v, %v", got, err, tc.want, tc.err)
			}
		})
	}
}

func TestSupabaseIdentityReaderFailures(t *testing.T) {
	if _, err := auth.NewSupabaseIdentityReader("http://127.0.0.1:54321", " "); err == nil {
		t.Fatal("reader built without a service key")
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()
	reader, _ := auth.NewSupabaseIdentityReader(server.URL, "secret")
	if _, err := reader.GoogleIdentity(context.Background(), uuid.New()); err == nil || errors.Is(err, auth.ErrNoGoogleIdentity) {
		t.Fatalf("a 500 must be a lookup error, not 'no identity': %v", err)
	}
	if _, err := (auth.UnavailableIdentityReader{}).GoogleIdentity(context.Background(), uuid.New()); !errors.Is(err, auth.ErrIdentityLookupUnavailable) {
		t.Fatalf("unavailable reader err = %v", err)
	}
}
