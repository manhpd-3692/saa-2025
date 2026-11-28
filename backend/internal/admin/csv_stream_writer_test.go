package admin

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// pagesOf returns a csvPageReader serving the pages in order, then err (when
// set) instead of the end of the file.
func pagesOf(err error, pages ...[][]string) csvPageReader {
	return func(context.Context) ([][]string, error) {
		if len(pages) == 0 {
			return nil, err
		}
		page := pages[0]
		pages = pages[1:]
		return page, nil
	}
}

func serveCSV(next csvPageReader) *httptest.ResponseRecorder {
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/export", nil)
	streamCSV(req.Context(), rec, req, "saa-test-2026-11-28.csv", []string{"Name", "Count"}, next)
	return rec
}

// SC-005, BR-004, FR-602: formula-like text cells get a leading apostrophe.
func TestCSVTextNeutralisesFormulaLikeCells(t *testing.T) {
	cases := map[string]string{
		"=SUM(A1)": "'=SUM(A1)", "+84 912": "'+84 912", "-1": "'-1", "@cmd": "'@cmd",
		"\tx": "'\tx", "\rx": "'\rx",
		"Nguyễn Văn An": "Nguyễn Văn An", "a=b": "a=b", "": "", "CECV1": "CECV1",
	}
	for in, want := range cases {
		if got := csvText(in); got != want {
			t.Errorf("csvText(%q) = %q, want %q", in, got, want)
		}
	}
}

// ALG-002: BOM, header row, CRLF rows, quoting of comma, quote and newline;
// download headers with the file name (Codex R06).
func TestStreamCSVWritesBOMHeaderAndQuotedRows(t *testing.T) {
	rec := serveCSV(pagesOf(nil, [][]string{{"Bình, \"B\"", "3"}}, [][]string{{"two\nlines", "0"}}))
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d", rec.Code)
	}
	// UseCRLF also writes a newline inside a quoted cell as CRLF.
	want := "\xEF\xBB\xBFName,Count\r\n\"Bình, \"\"B\"\"\",3\r\n\"two\r\nlines\",0\r\n"
	if got := rec.Body.String(); got != want {
		t.Fatalf("body %q\nwant %q", got, want)
	}
	h := rec.Header()
	if h.Get("Content-Type") != "text/csv; charset=utf-8" || h.Get("Cache-Control") != "no-store" {
		t.Errorf("headers %v", h)
	}
	if got := h.Get("Content-Disposition"); got != "attachment; filename=saa-test-2026-11-28.csv" {
		t.Errorf("Content-Disposition %q", got)
	}
}

// An empty match set is still a complete file: BOM and header row only.
func TestStreamCSVWithNoRowsWritesTheHeaderOnly(t *testing.T) {
	rec := serveCSV(pagesOf(nil))
	if rec.Code != http.StatusOK || rec.Body.String() != "\xEF\xBB\xBFName,Count\r\n" {
		t.Fatalf("status %d body %q", rec.Code, rec.Body.String())
	}
}

// Codex N11: a failure before the first page is read answers 500 JSON and no CSV byte.
func TestStreamCSVFirstPageFailureAnswersJSONWithoutCSV(t *testing.T) {
	rec := serveCSV(pagesOf(errors.New("database down")))
	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type %q", ct)
	}
	if rec.Header().Get("Content-Disposition") != "" || strings.Contains(rec.Body.String(), "\xEF\xBB\xBF") {
		t.Errorf("CSV bytes or download header after a pre-stream failure: %v %q", rec.Header(), rec.Body.String())
	}
}

// Codex N11 / SC-009: a failure after rows were streamed aborts the connection,
// so the client's body read fails instead of ending like a complete file.
func TestStreamCSVLateFailureAbortsTheConnection(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		streamCSV(r.Context(), w, r, "saa-test.csv", []string{"Name"},
			pagesOf(errors.New("read failed"), [][]string{{"first"}, {"second"}}))
	}))
	defer server.Close()

	res, err := http.Get(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	if res.StatusCode != http.StatusOK {
		t.Fatalf("status %d", res.StatusCode)
	}
	body, err := io.ReadAll(res.Body)
	if !errors.Is(err, io.ErrUnexpectedEOF) {
		t.Fatalf("body read error = %v, want unexpected EOF (aborted)", err)
	}
	if !strings.Contains(string(body), "first\r\nsecond\r\n") {
		t.Errorf("rows before the failure were not streamed: %q", body)
	}
}

// SC-002 / US006: CSV cells equal the table cells; text cells are neutralised,
// numbers are not; All first with a blank No; dashes become empty cells.
func TestCSVRecordsMatchTheTables(t *testing.T) {
	code := "=CECV9"
	got := overviewCSVRecords(Overview{Rows: []OverviewRow{
		{TotalMembers: 9, KudosSent: 4, KudosReceived: 4, UsersWithKudo: 5, SecretBoxes: 2},
		{UnitCode: &code, TotalMembers: 3, KudosSent: -1},
	}})
	if strings.Join(got[0], "|") != "|All|9|4|4|5|2" || strings.Join(got[1], "|") != "1|'=CECV9|3|-1|0|0|0" {
		t.Errorf("overview records %q", got)
	}

	legend := gamification.TierLegend
	seconds := int64(2*86400 + 5*3600 + 7*60 + 30)
	login := time.Date(2026, 11, 20, 3, 4, 0, 0, time.UTC) // 10:04 in Ho Chi Minh City
	id := uuid.MustParse("1234abcd-0000-4000-8000-000000000001")
	users := usersCSVRecords([]DirectoryUser{
		{ID: id, Name: "=SUM(A1)", Email: "@x@sun-asterisk.com", KudosSent: 2, KudosReceived: 3, TotalHeart: 7,
			Level: &legend, Badges: 6, TimeToSixBadgesSeconds: &seconds, LastLoginAt: &login, Role: db.UserRoleAdmin},
		{ID: id, Name: "Bình", Email: "binh@sun-asterisk.com", Role: db.UserRoleUser},
	})
	if want := "1234abcd|'=SUM(A1)|'@x@sun-asterisk.com|2|3|7|Legend Hero|6|2d 5h 7m|2026-11-20 10:04|Admin"; strings.Join(users[0], "|") != want {
		t.Errorf("user record %q\nwant %q", strings.Join(users[0], "|"), want)
	}
	if want := "1234abcd|Bình|binh@sun-asterisk.com|0|0|0||0|||User"; strings.Join(users[1], "|") != want {
		t.Errorf("user record %q\nwant %q", strings.Join(users[1], "|"), want)
	}
	for seconds, want := range map[int64]string{0: "0m", 45 * 60: "45m", 3*3600 + 12*60: "3h 12m", 86400: "1d 0h 0m"} {
		if got := formatBadgeDuration(seconds); got != want {
			t.Errorf("formatBadgeDuration(%d) = %q, want %q", seconds, got, want)
		}
	}
}
