package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/config"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

const testOrigin = "http://localhost:3000"

type profileRows map[uuid.UUID]db.UserRole

func (p profileRows) GetProfileAuth(_ context.Context, id uuid.UUID) (db.GetProfileAuthRow, error) {
	if role, ok := p[id]; ok {
		return db.GetProfileAuthRow{ID: id, Role: role}, nil
	}
	return db.GetProfileAuthRow{}, pgx.ErrNoRows
}

var ok200 = http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
	httpx.WriteJSON(w, http.StatusOK, map[string]bool{"ok": true})
})

// assembledDeps mirrors main(): real verifier against an in-process JWKS and
// real route classes (the F002/F003 handlers arrive in phase 2).
func assembledDeps(t *testing.T) (apiDeps, *testkit.TestJWKSIssuer, profileRows) {
	t.Helper()
	issuer := testkit.NewTestJWKSIssuer(t)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	verifier, err := auth.NewJWKSVerifier(ctx, issuer.JWKSURL(), issuer.Issuer())
	if err != nil {
		t.Fatal(err)
	}
	profiles := profileRows{}
	mw := auth.NewMiddleware(verifier, profiles)
	routes, err := httpx.NewRouteClasses(mw.RequireIdentity, mw.RequireProfile, auth.RequireAdmin)
	if err != nil {
		t.Fatal(err)
	}
	return apiDeps{Config: config.Config{FrontendOrigins: []string{testOrigin}}, Routes: routes}, issuer, profiles
}

// assembledRouter is the assembled deps behind CORS with one stand-in route per class.
func assembledRouter(t *testing.T) (http.Handler, *testkit.TestJWKSIssuer, profileRows) {
	t.Helper()
	deps, issuer, profiles := assembledDeps(t)
	register := func(mux routeMux, d apiDeps) {
		mux.Handle("GET /api/v1/events/current", d.Routes.Public(ok200))
		mux.Handle("POST /api/v1/me/provision", d.Routes.Identity(ok200))
		mux.Handle("GET /api/v1/me", d.Routes.Profile(ok200))
		mux.Handle("GET /api/v1/admin/overview", d.Routes.Admin(ok200))
	}
	return newRouter(deps, []routeRegistration{register}), issuer, profiles
}

// F002 SC-013 shape against the assembled router (Codex N09).
func TestAssembledRouterRouteClasses(t *testing.T) {
	router, issuer, profiles := assembledRouter(t)
	userID, adminID, orphanID := uuid.New(), uuid.New(), uuid.New()
	profiles[userID], profiles[adminID] = db.UserRoleUser, db.UserRoleAdmin
	token := func(id uuid.UUID) string {
		return issuer.Sign(t, issuer.ValidClaims(id, "sunner@sun-asterisk.com"))
	}

	tests := []struct {
		name, method, path, token string
		wantStatus                int
		wantCode                  string
	}{
		{"public without token", http.MethodGet, "/api/v1/events/current", "", 200, ""},
		{"identity without token", http.MethodPost, "/api/v1/me/provision", "", 401, "unauthorized"},
		{"profile without token", http.MethodGet, "/api/v1/me", "", 401, "unauthorized"},
		{"admin without token", http.MethodGet, "/api/v1/admin/overview", "", 401, "unauthorized"},
		{"public with orphan token", http.MethodGet, "/api/v1/events/current", token(orphanID), 200, ""},
		{"identity with orphan token", http.MethodPost, "/api/v1/me/provision", token(orphanID), 200, ""},
		{"profile with orphan token", http.MethodGet, "/api/v1/me", token(orphanID), 403, "profile_not_provisioned"},
		{"admin with orphan token", http.MethodGet, "/api/v1/admin/overview", token(orphanID), 403, "profile_not_provisioned"},
		{"profile as user", http.MethodGet, "/api/v1/me", token(userID), 200, ""},
		{"admin as user", http.MethodGet, "/api/v1/admin/overview", token(userID), 403, "forbidden"},
		{"admin as admin", http.MethodGet, "/api/v1/admin/overview", token(adminID), 200, ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(tc.method, tc.path, nil)
			req.Header.Set("Origin", testOrigin)
			if tc.token != "" {
				req.Header.Set("Authorization", "Bearer "+tc.token)
			}
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			var body httpx.ErrorEnvelope
			_ = json.Unmarshal(rec.Body.Bytes(), &body)
			if rec.Code != tc.wantStatus || body.Error.Code != tc.wantCode {
				t.Fatalf("got %d %q, want %d %q", rec.Code, body.Error.Code, tc.wantStatus, tc.wantCode)
			}
			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
				t.Errorf("Access-Control-Allow-Origin = %q, want %q on every class", got, testOrigin)
			}
		})
	}
}

// Preflight to every route class is answered 204 by CORS without a JWT.
func TestAssembledRouterPreflightNeedsNoJWT(t *testing.T) {
	router, _, _ := assembledRouter(t)
	for _, path := range []string{"/api/v1/events/current", "/api/v1/me/provision", "/api/v1/me", "/api/v1/admin/overview"} {
		req := httptest.NewRequest(http.MethodOptions, path, nil)
		req.Header.Set("Origin", testOrigin)
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "authorization")
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Origin") != testOrigin {
			t.Errorf("%s preflight = %d (ACAO %q), want 204 with CORS headers",
				path, rec.Code, rec.Header().Get("Access-Control-Allow-Origin"))
		}
	}
}

// Every wire_<capability>.go registration must coexist on one mux: a duplicate
// or conflicting pattern panics here instead of at server start.
func TestRegisteredCapabilitiesDoNotConflict(t *testing.T) {
	routes, err := httpx.NewRouteClasses(func(h http.Handler) http.Handler { return h },
		func(h http.Handler) http.Handler { return h }, func(h http.Handler) http.Handler { return h })
	if err != nil {
		t.Fatal(err)
	}
	if len(routeRegistrations) == 0 {
		t.Fatal("no wire_<capability>.go registrations found")
	}
	newRouter(apiDeps{Routes: routes}, routeRegistrations)
}

type stubPinger struct{ err error }

func (s stubPinger) Ping(context.Context) error { return s.err }

func TestHealthHandler(t *testing.T) {
	for name, tc := range map[string]struct {
		err  error
		want int
	}{"database up": {nil, 200}, "database down": {errors.New("refused"), 503}} {
		t.Run(name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			healthHandler(stubPinger{tc.err}).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
			if rec.Code != tc.want {
				t.Fatalf("status %d, want %d", rec.Code, tc.want)
			}
		})
	}
}

func TestNewRouteClassesRejectsMissingChain(t *testing.T) {
	if _, err := httpx.NewRouteClasses(nil, nil, nil); err == nil {
		t.Fatal("NewRouteClasses accepted nil chains")
	}
}

// W2: a handler panic is a 500 envelope that still carries CORS headers, which
// only holds when Recover sits inside CORS.
func TestAssembledRouterPanicKeepsCORSHeaders(t *testing.T) {
	deps, _, _ := assembledDeps(t)
	router := newRouter(deps, []routeRegistration{func(mux routeMux, _ apiDeps) {
		mux.Handle("GET /boom", http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("handler bug") }))
	}})
	req := httptest.NewRequest(http.MethodGet, "/boom", nil)
	req.Header.Set("Origin", testOrigin)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	var body httpx.ErrorEnvelope
	_ = json.Unmarshal(rec.Body.Bytes(), &body)
	if rec.Code != http.StatusInternalServerError || body.Error.Code != httpx.CodeInternal {
		t.Fatalf("got %d %q, want 500 %q", rec.Code, body.Error.Code, httpx.CodeInternal)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q on the panic response", got, testOrigin)
	}
}
