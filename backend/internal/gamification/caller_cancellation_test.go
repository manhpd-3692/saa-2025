package gamification_test

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// captureLogs routes slog to a buffer for the test.
func captureLogs(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&buf, &slog.HandlerOptions{Level: slog.LevelDebug})))
	t.Cleanup(func() { slog.SetDefault(previous) })
	return &buf
}

// A read the caller abandoned (tab closed, navigation, the browser's 5 s budget)
// is logged at INFO, not ERROR; the same failure while the caller still waits
// stays ERROR, so a database outage is still alerted on. The summary handler
// shares canceledByCaller (it needs the PROFILE auth context, set only by the
// auth middleware).
func TestActiveCampaignHandlerLogsCallerCancellationAtInfo(t *testing.T) {
	for _, tc := range []struct {
		callerGone bool
		err        error
		wantLevel  string
	}{
		{true, context.Canceled, "level=INFO"},
		{true, context.DeadlineExceeded, "level=INFO"},
		{false, errors.New("connection refused"), "level=ERROR"},
		{false, context.DeadlineExceeded, "level=ERROR"}, // our own 5 s deadline: a server fault
	} {
		logs := captureLogs(t)
		ctx, cancel := context.WithCancel(context.Background())
		if tc.callerGone {
			cancel()
		}
		rec := httptest.NewRecorder()
		gamification.NewActiveCampaignHandler(fixedCampaigns{err: tc.err}).
			ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/campaigns/active", nil).WithContext(ctx))
		cancel()
		out := logs.String()
		if !strings.Contains(out, tc.wantLevel) || (tc.wantLevel == "level=INFO" && strings.Contains(out, "level=ERROR")) {
			t.Errorf("caller gone %v, %v: logs %q, want %s", tc.callerGone, tc.err, out, tc.wantLevel)
		}
	}
}
