//go:build integration

package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/config"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// apiHarness is the assembled router exactly as main() builds it (every
// wire_<capability>.go registration, CORS, route classes), over the real local
// database and Storage; only the JWKS is the in-process test issuer.
type apiHarness struct {
	t          *testing.T
	db         *testkit.TestDatabase
	issuer     *testkit.TestJWKSIssuer
	router     http.Handler
	adminEmail string
}

func newAPIHarness(t *testing.T) *apiHarness {
	t.Helper()
	tdb := testkit.OpenTestDatabase(t)
	issuer := testkit.NewTestJWKSIssuer(t)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	verifier, err := auth.NewJWKSVerifier(ctx, issuer.JWKSURL(), issuer.Issuer())
	if err != nil {
		t.Fatal(err)
	}
	queries := db.New(tdb.App)
	mw := auth.NewMiddleware(verifier, queries)
	routes, err := httpx.NewRouteClasses(mw.RequireIdentity, mw.RequireProfile, auth.RequireAdmin)
	if err != nil {
		t.Fatal(err)
	}
	adminEmail := testkit.UniqueEmail("api.admin")
	cfg := config.Config{
		FrontendOrigins:    []string{testOrigin},
		SupabaseURL:        os.Getenv("SUPABASE_URL"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_KEY"),
		AdminEmails:        []string{adminEmail},
	}
	deps := apiDeps{Config: cfg, Pool: tdb.App, Queries: queries, Routes: routes}
	return &apiHarness{t: t, db: tdb, issuer: issuer, router: newRouter(deps, routeRegistrations), adminEmail: adminEmail}
}

// token signs a valid access token for a Sunner (claims as Supabase issues them).
func (h *apiHarness) token(id uuid.UUID, email string) string {
	return h.issuer.Sign(h.t, h.issuer.ValidClaims(id, email))
}

// sunner creates a Sunner and returns its id and bearer token.
func (h *apiHarness) sunner(spec testkit.SunnerSpec) (uuid.UUID, string) {
	h.t.Helper()
	if spec.Email == "" {
		spec.Email = testkit.UniqueEmail("api")
	}
	id := h.db.CreateSunner(h.t, spec)
	return id, h.token(id, spec.Email)
}

type apiResponse struct {
	Status int
	Header http.Header
	Body   []byte
}

func (r apiResponse) json(t *testing.T) map[string]any {
	t.Helper()
	var out map[string]any
	if err := json.Unmarshal(r.Body, &out); err != nil {
		t.Fatalf("body %q is not a JSON object: %v", r.Body, err)
	}
	return out
}

func (r apiResponse) errorCode(t *testing.T) string {
	t.Helper()
	code, _ := r.json(t)["error"].(map[string]any)["code"].(string)
	return code
}

// do sends one browser-like request from the allowed origin.
func (h *apiHarness) do(method, path, token string, body any, headers ...string) apiResponse {
	h.t.Helper()
	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			h.t.Fatal(err)
		}
		reader = bytes.NewReader(raw)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Origin", testOrigin)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}
	rec := httptest.NewRecorder()
	h.router.ServeHTTP(rec, req)
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != testOrigin {
		h.t.Errorf("%s %s: Access-Control-Allow-Origin = %q, want %q on every answer", method, path, got, testOrigin)
	}
	return apiResponse{Status: rec.Code, Header: rec.Header(), Body: rec.Body.Bytes()}
}
