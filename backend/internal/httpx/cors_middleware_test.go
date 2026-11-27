package httpx_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

const allowedOrigin = "http://localhost:3000"

func serveCORS(t *testing.T, req *http.Request) (*httptest.ResponseRecorder, bool) {
	t.Helper()
	reached := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		reached = true
		w.WriteHeader(http.StatusTeapot)
	})
	rec := httptest.NewRecorder()
	httpx.CORS([]string{allowedOrigin})(next).ServeHTTP(rec, req)
	return rec, reached
}

func preflight(origin string) *http.Request {
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/kudos", nil)
	req.Header.Set("Origin", origin)
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	req.Header.Set("Access-Control-Request-Headers", "authorization,content-type,idempotency-key")
	return req
}

// F002 SC-009 / Codex R06: preflight answered 204 by CORS, without any JWT.
func TestCORSPreflightFromAllowedOriginIs204WithoutJWT(t *testing.T) {
	rec, reached := serveCORS(t, preflight(allowedOrigin))

	if rec.Code != http.StatusNoContent || reached {
		t.Fatalf("status %d, reached handler %v; want 204 answered by CORS", rec.Code, reached)
	}
	want := map[string]string{
		"Access-Control-Allow-Origin":  allowedOrigin,
		"Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
		"Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
		"Access-Control-Max-Age":       "600",
	}
	for header, value := range want {
		if got := rec.Header().Get(header); got != value {
			t.Errorf("%s = %q, want %q", header, got, value)
		}
	}
	if got := rec.Header().Get("Access-Control-Allow-Credentials"); got != "" {
		t.Errorf("Access-Control-Allow-Credentials = %q, want absent (bearer only)", got)
	}
}

func TestCORSPreflightFromOtherOriginGetsNoCORSHeaders(t *testing.T) {
	rec, reached := serveCORS(t, preflight("https://evil.example"))

	if rec.Code != http.StatusNoContent || reached {
		t.Fatalf("status %d, reached handler %v; want 204 answered by CORS", rec.Code, reached)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want absent", got)
	}
}

func TestCORSActualRequests(t *testing.T) {
	tests := []struct {
		name, origin, wantAllowOrigin, wantExpose string
	}{
		{"allowed origin", allowedOrigin, allowedOrigin, "Content-Disposition"},
		{"other origin", "http://localhost:3001", "", ""},
		{"no origin (server-side fetch)", "", "", ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/me", nil)
			if tc.origin != "" {
				req.Header.Set("Origin", tc.origin)
			}
			rec, reached := serveCORS(t, req)

			if !reached || rec.Code != http.StatusTeapot {
				t.Fatalf("status %d, reached %v; want request passed to the handler", rec.Code, reached)
			}
			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != tc.wantAllowOrigin {
				t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, tc.wantAllowOrigin)
			}
			if got := rec.Header().Get("Access-Control-Expose-Headers"); got != tc.wantExpose {
				t.Errorf("Access-Control-Expose-Headers = %q, want %q", got, tc.wantExpose)
			}
			if got := rec.Header().Get("Vary"); got != "Origin" {
				t.Errorf("Vary = %q, want Origin", got)
			}
		})
	}
}

// A non-preflight OPTIONS (no Access-Control-Request-Method) is an ordinary request.
func TestCORSPlainOptionsPassesThrough(t *testing.T) {
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/me", nil)
	req.Header.Set("Origin", allowedOrigin)
	if _, reached := serveCORS(t, req); !reached {
		t.Fatal("plain OPTIONS did not reach the handler")
	}
}
