package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

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
