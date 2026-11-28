package httpx_test

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// A failure that is only the caller hanging up is INFO; everything else,
// including our own deadline while the caller still waits, is ERROR.
func TestLogRequestFailureLevels(t *testing.T) {
	var buf bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})))
	t.Cleanup(func() { slog.SetDefault(previous) })

	for _, tc := range []struct {
		name       string
		callerGone bool
		err        error
		want       string
	}{
		{"caller cancelled", true, fmt.Errorf("read: %w", context.Canceled), "level=INFO"},
		{"caller's deadline", true, fmt.Errorf("read: timeout: %w", context.DeadlineExceeded), "level=INFO"},
		{"database down while the caller waits", false, errors.New("connection refused"), "level=ERROR"},
		{"our 5 s deadline while the caller waits", false, fmt.Errorf("read: %w", context.DeadlineExceeded), "level=ERROR"},
		{"database down after the caller left", true, errors.New("connection refused"), "level=ERROR"},
	} {
		buf.Reset()
		ctx, cancel := context.WithCancel(context.Background())
		if tc.callerGone {
			cancel()
		}
		r := httptest.NewRequest(http.MethodGet, "/api/v1/x", nil).WithContext(ctx)
		httpx.LogRequestFailure(r, tc.err, "read thing", "id", "k1")
		cancel()
		out := buf.String()
		if !strings.Contains(out, tc.want) || !strings.Contains(out, "id=k1") || !strings.Contains(out, "error=") {
			t.Errorf("%s: logged %q, want %s with the args and the error", tc.name, out, tc.want)
		}
	}
}
