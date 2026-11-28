//go:build integration

package admin

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// failingListQueries are the real queries except that the AdminListUsers call
// number failOnCall (1-based) fails, as a database error mid-export would.
type failingListQueries struct {
	Queries
	failOnCall int32
	calls      atomic.Int32
}

func (q *failingListQueries) AdminListUsers(ctx context.Context, arg db.AdminListUsersParams) ([]db.AdminListUsersRow, error) {
	if q.calls.Add(1) == q.failOnCall {
		return nil, errors.New("injected read failure")
	}
	return q.Queries.AdminListUsers(ctx, arg)
}

// SC-009, Codex N11: with a user set larger than one read page, a read error
// after rows were streamed aborts the connection (the client's body read
// fails, so no complete-looking file exists); a read error before the first
// page answers 500 JSON with no CSV byte; without the fault the retry
// downloads every row.
func TestUsersExportFailureBeforeAndAfterStreamingStarted(t *testing.T) {
	f := newReportFixture(t)
	unit, _ := f.unit()
	for _, name := range []string{"Stream A", "Stream B", "Stream C", "Stream D", "Stream E"} {
		f.sunner(name, &unit, false)
	}
	target := "/api/v1/admin/users/export?unit=" + unit.String()

	serve := func(failOnCall int32) (*http.Response, []byte, error) {
		service := NewService(&failingListQueries{Queries: db.New(f.tdb.App), failOnCall: failOnCall})
		service.exportPageSize = 2 // five matches = three read pages
		server := httptest.NewServer(NewUsersExportHandler(service))
		defer server.Close()
		res, err := http.Get(server.URL + target)
		if err != nil {
			t.Fatal(err)
		}
		defer func() { _ = res.Body.Close() }()
		body, readErr := io.ReadAll(res.Body)
		return res, body, readErr
	}

	res, body, err := serve(2) // the second page fails: two rows already sent
	if res.StatusCode != http.StatusOK || !errors.Is(err, io.ErrUnexpectedEOF) {
		t.Fatalf("late failure: status %d, body read error %v; want 200 then an aborted body", res.StatusCode, err)
	}
	if !strings.Contains(string(body), "Stream B") || strings.Contains(string(body), "Stream C") {
		t.Errorf("late failure streamed %q, want exactly the first page before the abort", body)
	}

	res, body, err = serve(1) // the first page fails: nothing streamed yet
	if err != nil || res.StatusCode != http.StatusInternalServerError || !strings.HasPrefix(res.Header.Get("Content-Type"), "application/json") ||
		res.Header.Get("Content-Disposition") != "" || !strings.Contains(string(body), `"internal_error"`) {
		t.Errorf("early failure: status %d, headers %v, body %q, err %v; want 500 JSON without a file", res.StatusCode, res.Header, body, err)
	}

	res, body, err = serve(0) // retry without a fault
	lines := strings.Split(strings.TrimSuffix(string(body), "\r\n"), "\r\n")
	if err != nil || res.StatusCode != http.StatusOK || len(lines) != 6 || !strings.HasPrefix(lines[0], "\xEF\xBB\xBFID,User,Email") {
		t.Errorf("retry: status %d, err %v, %d lines %q; want BOM, header and five rows", res.StatusCode, err, len(lines), lines)
	}
}
