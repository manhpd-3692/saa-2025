package auth_test

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// cancellingProfiles is a caller who hangs up while the profile row is read.
type cancellingProfiles struct{ hangUp context.CancelFunc }

func (p cancellingProfiles) GetProfileAuth(ctx context.Context, _ uuid.UUID) (db.GetProfileAuthRow, error) {
	p.hangUp()
	<-ctx.Done()
	return db.GetProfileAuthRow{}, fmt.Errorf("get profile auth: %w", ctx.Err())
}

// The profile-role load of every PROFILE request logs a caller who hung up at
// INFO; a failing database while the caller waits stays ERROR (still 500 both).
func TestProfileLoadLogsCallerCancellationAtInfo(t *testing.T) {
	verifier, issuer := newTestVerifier(t)
	token := "Bearer " + issuer.Sign(t, issuer.ValidClaims(uuid.New(), "sunner@sun-asterisk.com"))
	var logs bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(previous) })

	serve := func(profiles interface {
		GetProfileAuth(context.Context, uuid.UUID) (db.GetProfileAuthRow, error)
	}, ctx context.Context) int {
		logs.Reset()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/anything", nil).WithContext(ctx)
		req.Header.Set("Authorization", token)
		rec := httptest.NewRecorder()
		auth.NewMiddleware(verifier, profiles).RequireProfile(echoCaller).ServeHTTP(rec, req)
		return rec.Code
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if code := serve(cancellingProfiles{hangUp: cancel}, ctx); code != http.StatusInternalServerError ||
		!strings.Contains(logs.String(), "level=INFO") || strings.Contains(logs.String(), "level=ERROR") {
		t.Errorf("caller hung up: %d, logs %q; want 500 logged at INFO", code, logs.String())
	}
	if code := serve(failingProfiles{}, context.Background()); code != http.StatusInternalServerError ||
		!strings.Contains(logs.String(), "level=ERROR") {
		t.Errorf("database down: %d, logs %q; want 500 logged at ERROR", code, logs.String())
	}
}
