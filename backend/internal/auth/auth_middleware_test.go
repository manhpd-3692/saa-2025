package auth_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// profileRows stands in for the users table at the GetProfileAuth boundary;
// the real query runs in the integration suite.
type profileRows map[uuid.UUID]db.UserRole

func (p profileRows) GetProfileAuth(_ context.Context, id uuid.UUID) (db.GetProfileAuthRow, error) {
	role, ok := p[id]
	if !ok {
		return db.GetProfileAuthRow{}, pgx.ErrNoRows
	}
	return db.GetProfileAuthRow{ID: id, Role: role}, nil
}

type failingProfiles struct{}

func (failingProfiles) GetProfileAuth(context.Context, uuid.UUID) (db.GetProfileAuthRow, error) {
	return db.GetProfileAuthRow{}, errors.New("connection refused")
}

// echoCaller reports what the auth chain put on the context.
var echoCaller = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	body := map[string]string{}
	if id, ok := auth.IdentityFromContext(r.Context()); ok {
		body["identity"] = id.UserID.String()
	}
	if ac, ok := auth.FromContext(r.Context()); ok {
		body["userId"], body["role"] = ac.UserID.String(), string(ac.Role)
	}
	_ = json.NewEncoder(w).Encode(body)
})

type response struct {
	status int
	code   string
	body   map[string]string
}

func call(t *testing.T, h http.Handler, token, reqBody string) response {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/anything?role=admin", strings.NewReader(reqBody))
	req.Header.Set("X-User-Role", "admin")
	if token != "" {
		req.Header.Set("Authorization", token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	var envelope struct {
		Error struct{ Code string } `json:"error"`
	}
	raw := rec.Body.Bytes()
	_ = json.Unmarshal(raw, &envelope)
	body := map[string]string{}
	_ = json.Unmarshal(raw, &body)
	return response{status: rec.Code, code: envelope.Error.Code, body: body}
}

func TestAuthMiddlewareChains(t *testing.T) {
	verifier, issuer := newTestVerifier(t)
	userID, adminID, orphanID := uuid.New(), uuid.New(), uuid.New()
	mw := auth.NewMiddleware(verifier, profileRows{userID: db.UserRoleUser, adminID: db.UserRoleAdmin})

	bearer := func(id uuid.UUID, email string, mutate func(jwt.MapClaims)) string {
		claims := issuer.ValidClaims(id, email)
		if mutate != nil {
			mutate(claims)
		}
		return "Bearer " + issuer.Sign(t, claims)
	}
	company := "sunner@sun-asterisk.com"
	identity := mw.RequireIdentity(echoCaller)
	profile := mw.RequireProfile(echoCaller)
	admin := mw.RequireProfile(auth.RequireAdmin(echoCaller))

	tests := []struct {
		name       string
		handler    http.Handler
		token      string
		wantStatus int
		wantCode   string
	}{
		{"missing token", profile, "", http.StatusUnauthorized, "unauthorized"},
		{"non-bearer scheme", profile, "Basic abc", http.StatusUnauthorized, "unauthorized"},
		{"empty bearer", identity, "Bearer ", http.StatusUnauthorized, "unauthorized"},
		{"invalid token", identity, "Bearer not.a.jwt", http.StatusUnauthorized, "unauthorized"},
		{"other domain", identity, bearer(userID, "someone@gmail.com", nil), http.StatusForbidden, "domain_not_allowed"},
		{"look-alike domain", profile, bearer(userID, "x@evil-sun-asterisk.com", nil), http.StatusForbidden, "domain_not_allowed"},
		// W3: user_metadata is client-writable, so email_verified there decides nothing.
		{"client-writable email_verified=false is ignored", profile, bearer(userID, company, func(c jwt.MapClaims) {
			c["user_metadata"] = map[string]any{"email_verified": false}
		}), http.StatusOK, ""},
		{"no user_metadata at all", profile, bearer(userID, company, func(c jwt.MapClaims) {
			delete(c, "user_metadata")
		}), http.StatusOK, ""},
		{"google plus another linked provider", profile, bearer(userID, company, func(c jwt.MapClaims) {
			c["app_metadata"] = map[string]any{"provider": "google", "providers": []string{"google", "email"}}
		}), http.StatusForbidden, "domain_not_allowed"},
		{"only google in providers", profile, bearer(userID, company, func(c jwt.MapClaims) {
			c["app_metadata"] = map[string]any{"provider": "google", "providers": []string{"google"}}
		}), http.StatusOK, ""},
		{"no provider claim", identity, bearer(userID, company, func(c jwt.MapClaims) {
			c["app_metadata"] = map[string]any{"providers": []string{"google"}}
		}), http.StatusForbidden, "domain_not_allowed"},
		{"non-google provider", identity, bearer(userID, company, func(c jwt.MapClaims) {
			c["app_metadata"] = map[string]any{"provider": "email"}
		}), http.StatusForbidden, "domain_not_allowed"},
		{"identity route without profile row", identity, bearer(orphanID, company, nil), http.StatusOK, ""},
		{"profile route without profile row", profile, bearer(orphanID, company, nil), http.StatusForbidden, "profile_not_provisioned"},
		{"admin route without profile row", admin, bearer(orphanID, company, nil), http.StatusForbidden, "profile_not_provisioned"},
		{"profile route for user", profile, bearer(userID, company, nil), http.StatusOK, ""},
		{"lower-case bearer scheme", profile, strings.Replace(bearer(userID, company, nil), "Bearer", "bearer", 1), http.StatusOK, ""},
		{"admin route for user", admin, bearer(userID, company, nil), http.StatusForbidden, "forbidden"},
		{"admin route for admin", admin, bearer(adminID, company, nil), http.StatusOK, ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := call(t, tc.handler, tc.token, "")
			if got.status != tc.wantStatus || got.code != tc.wantCode {
				t.Fatalf("got %d %q, want %d %q", got.status, got.code, tc.wantStatus, tc.wantCode)
			}
		})
	}
}

// F002 SC-008 / BR-004: role claims in the token, body, header or query never
// raise the stored role.
func TestAuthMiddlewareTakesRoleOnlyFromUsersRow(t *testing.T) {
	verifier, issuer := newTestVerifier(t)
	userID := uuid.New()
	mw := auth.NewMiddleware(verifier, profileRows{userID: db.UserRoleUser})
	claims := issuer.ValidClaims(userID, "sunner@sun-asterisk.com")
	claims["role"] = "admin"
	claims["app_metadata"] = map[string]any{"provider": "google", "role": "admin"}
	token := "Bearer " + issuer.Sign(t, claims)

	got := call(t, mw.RequireProfile(echoCaller), token, `{"role":"admin","userId":"`+uuid.NewString()+`"}`)
	if got.status != http.StatusOK || got.body["role"] != "user" || got.body["userId"] != userID.String() {
		t.Fatalf("profile chain = %d %v, want 200 with stored role user for %s", got.status, got.body, userID)
	}
	got = call(t, mw.RequireProfile(auth.RequireAdmin(echoCaller)), token, `{"role":"admin"}`)
	if got.status != http.StatusForbidden || got.code != "forbidden" {
		t.Fatalf("admin chain = %d %q, want 403 forbidden", got.status, got.code)
	}
}

func TestAuthMiddlewareProfileLookupFailureIs500(t *testing.T) {
	verifier, issuer := newTestVerifier(t)
	mw := auth.NewMiddleware(verifier, failingProfiles{})
	token := "Bearer " + issuer.Sign(t, issuer.ValidClaims(uuid.New(), "sunner@sun-asterisk.com"))

	got := call(t, mw.RequireProfile(echoCaller), token, "")
	if got.status != http.StatusInternalServerError || got.code != "internal_error" {
		t.Fatalf("got %d %q, want 500 internal_error", got.status, got.code)
	}
}

func TestRequireAdminWithoutAuthContextFailsClosed(t *testing.T) {
	got := call(t, auth.RequireAdmin(echoCaller), "", "")
	if got.status != http.StatusForbidden || got.code != "forbidden" {
		t.Fatalf("got %d %q, want 403 forbidden", got.status, got.code)
	}
}
