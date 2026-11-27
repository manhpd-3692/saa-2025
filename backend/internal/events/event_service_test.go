package events_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/events"
)

type fakeEvents struct {
	row db.GetCurrentEventRow
	err error
}

func (f fakeEvents) GetCurrentEvent(context.Context) (db.GetCurrentEventRow, error) {
	return f.row, f.err
}

// F003 BR-001: launched only when server time is at or after start_at.
func TestCurrentEventStatusAroundStartAt(t *testing.T) {
	start := time.Date(2026, 12, 15, 11, 0, 0, 0, time.UTC)
	row := db.GetCurrentEventRow{Name: "SAA 2025", StartAt: start, CeremonyAt: start.Add(14 * 24 * time.Hour)}
	cases := map[string]struct {
		now  time.Time
		want string
	}{
		"one nanosecond before": {start.Add(-time.Nanosecond), events.StatusUpcoming},
		"exactly at start":      {start, events.StatusActive},
		"after start":           {start.Add(time.Hour), events.StatusActive},
	}
	for name, tc := range cases {
		svc := events.NewService(fakeEvents{row: row}, func() time.Time { return tc.now })
		got, err := svc.Current(context.Background())
		if err != nil || got.Status != tc.want || !got.ServerNow.Equal(tc.now) {
			t.Errorf("%s: %+v, %v; want status %s", name, got, err, tc.want)
		}
	}
}

// F003 A3 results: 200 with the shape, 404 without a row, 500 on a database error.
func TestEventsHandlerAnswers(t *testing.T) {
	cases := map[string]struct {
		reader fakeEvents
		status int
		code   string
	}{
		"event":    {fakeEvents{row: db.GetCurrentEventRow{Name: "SAA 2025"}}, http.StatusOK, ""},
		"no row":   {fakeEvents{err: pgx.ErrNoRows}, http.StatusNotFound, events.CodeEventNotFound},
		"db error": {fakeEvents{err: errors.New("down")}, http.StatusInternalServerError, "internal_error"},
	}
	for name, tc := range cases {
		rec := httptest.NewRecorder()
		events.NewHandler(events.NewService(tc.reader, time.Now)).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/events/current", nil))
		var body map[string]any
		_ = json.Unmarshal(rec.Body.Bytes(), &body)
		if rec.Code != tc.status || rec.Header().Get("Cache-Control") != "no-store" {
			t.Errorf("%s: status %d cache %q", name, rec.Code, rec.Header().Get("Cache-Control"))
		}
		if tc.code != "" && body["error"].(map[string]any)["code"] != tc.code {
			t.Errorf("%s: body %v, want code %s", name, body, tc.code)
		}
		if tc.status == http.StatusOK {
			for _, key := range []string{"id", "name", "startAt", "ceremonyAt", "venue", "livestreamNote", "serverNow", "status"} {
				if _, ok := body[key]; !ok {
					t.Errorf("%s: response lacks %q: %v", name, key, body)
				}
			}
		}
	}
}
