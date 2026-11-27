package httpx_test

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// captureDefaultLogger routes slog's default logger into a buffer for one test.
func captureDefaultLogger(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&buf, nil)))
	t.Cleanup(func() { slog.SetDefault(previous) })
	return &buf
}

// W2: a panicking handler answers the error envelope (not a dropped connection)
// and the panic plus stack reach the log; the cause never reaches the client.
func TestRecoverAnswers500EnvelopeAndLogsStack(t *testing.T) {
	logs := captureDefaultLogger(t)
	panicking := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom: secret detail") })

	rec := httptest.NewRecorder()
	httpx.Recover(panicking).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/x", nil))

	var body httpx.ErrorEnvelope
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("body is not JSON: %v (%q)", err, rec.Body.String())
	}
	if rec.Code != http.StatusInternalServerError || body.Error.Code != httpx.CodeInternal {
		t.Fatalf("got %d %q, want 500 %q", rec.Code, body.Error.Code, httpx.CodeInternal)
	}
	if strings.Contains(rec.Body.String(), "secret detail") {
		t.Errorf("response leaks the panic value: %s", rec.Body.String())
	}
	logged := logs.String()
	for _, want := range []string{"boom: secret detail", "stack", "TestRecoverAnswers500EnvelopeAndLogsStack", "/api/v1/x"} {
		if !strings.Contains(logged, want) {
			t.Errorf("log does not contain %q: %s", want, logged)
		}
	}
}

func TestRecoverPassesThroughNormalResponses(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusTeapot) })
	rec := httptest.NewRecorder()
	httpx.Recover(ok).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))
	if rec.Code != http.StatusTeapot {
		t.Fatalf("status %d, want 418", rec.Code)
	}
}

// http.ErrAbortHandler is the stdlib's deliberate "abort this response" signal;
// swallowing it would turn an intentional abort into a 500.
func TestRecoverRepanicsErrAbortHandler(t *testing.T) {
	aborting := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic(http.ErrAbortHandler) })
	defer func() {
		if got := recover(); got != http.ErrAbortHandler {
			t.Fatalf("recovered %v, want http.ErrAbortHandler re-panicked", got)
		}
	}()
	httpx.Recover(aborting).ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))
}
