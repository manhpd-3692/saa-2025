//go:build integration

package admin

import (
	"context"
	"encoding/csv"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
)

// overviewRowFor finds the row of a unit (nil: the All row).
func overviewRowFor(t *testing.T, o Overview, unit *uuid.UUID) OverviewRow {
	t.Helper()
	for _, row := range o.Rows {
		if (unit == nil && row.UnitID == nil) || (unit != nil && row.UnitID != nil && *row.UnitID == *unit) {
			return row
		}
	}
	t.Fatalf("no overview row for unit %v", unit)
	return OverviewRow{}
}

func counts(row OverviewRow) [4]int32 {
	return [4]int32{row.KudosSent, row.KudosReceived, row.UsersWithKudo, row.SecretBoxes}
}

// SC-001, SC-002: spam excluded, both edge days counted and their neighbours
// not, All counts each person once (people without a unit included), an empty
// unit shows zeros, headcount ignores the range; the CSV equals the JSON.
func TestOverviewCountsByUnitAndAll(t *testing.T) {
	f := newReportFixture(t)
	unitA, codeA := f.unit()
	unitB, _ := f.unit()
	unitC, _ := f.unit()
	a1 := f.sunner("Overview A1", &unitA, false)
	a2 := f.sunner("Overview A2", &unitA, false)
	b1 := f.sunner("Overview B1", &unitB, false)
	n1 := f.sunner("Overview No Unit", nil, false)

	f.kudo(a1, b1, vn(10, 0, 0, 0), false)    // first day, first second: counted
	f.kudo(b1, n1, vn(12, 23, 59, 59), false) // last day, last second: counted
	f.kudo(a2, a1, vn(11, 9, 0, 0), true)     // spam: never counted (BR-002)
	f.kudo(n1, a2, vn(13, 0, 0, 0), false)    // the day after: not counted
	f.kudo(a2, b1, vn(9, 23, 59, 59), false)  // the day before: not counted
	f.box(a1, 1, vn(11, 8, 0, 0), "", time.Time{})
	f.box(n1, 1, vn(11, 8, 0, 0), "REVIVAL", vn(11, 9, 0, 0))
	f.box(b1, 1, vn(13, 0, 0, 0), "", time.Time{}) // the day after

	rng := ParseDateRange("2003-02-10", "2003-02-12", time.Now())
	overview, err := f.service.Overview(context.Background(), rng)
	if err != nil {
		t.Fatal(err)
	}
	if overview.From != "2003-02-10" || overview.To != "2003-02-12" || overview.Rows[0].UnitID != nil {
		t.Fatalf("range %s..%s, first row %+v: want the range and All first", overview.From, overview.To, overview.Rows[0])
	}
	cases := []struct {
		name    string
		unit    *uuid.UUID
		members int32
		want    [4]int32 // sent, received, with kudo, boxes
	}{
		{"unit A", &unitA, 2, [4]int32{1, 0, 1, 1}},
		{"unit B", &unitB, 1, [4]int32{1, 1, 1, 0}},
		{"empty unit C", &unitC, 0, [4]int32{0, 0, 0, 0}},
	}
	for _, c := range cases {
		row := overviewRowFor(t, overview, c.unit)
		if row.TotalMembers != c.members || counts(row) != c.want {
			t.Errorf("%s: members %d counts %v, want %d %v", c.name, row.TotalMembers, counts(row), c.members, c.want)
		}
	}
	all := overviewRowFor(t, overview, nil)
	if counts(all) != [4]int32{2, 2, 3, 2} || all.TotalMembers < 4 {
		t.Errorf("All: members %d counts %v, want >= 4 and [2 2 3 2] (a1, b1, n1 once each)", all.TotalMembers, counts(all))
	}

	// SC-002: the export of the same range holds the same numbers, All first.
	records := exportCSV(t, NewOverviewExportHandler(f.service), "/export?from=2003-02-10&to=2003-02-12",
		"saa-overview-2003-02-10_2003-02-12.csv")
	if strings.Join(records[1][:2], "|") != "|All" || records[1][3] != "2" || records[1][5] != "3" {
		t.Errorf("All CSV row %q", records[1])
	}
	for _, rec := range records[2:] {
		if rec[1] == codeA {
			want := []string{"2", "1", "0", "1", "1"}
			if strings.Join(rec[2:], "|") != strings.Join(want, "|") {
				t.Errorf("unit A CSV row %q, want counts %q", rec, want)
			}
			return
		}
	}
	t.Errorf("unit A missing from the CSV")
}

// FR-104 / BR-006: a malformed or reversed range answers the default range.
func TestOverviewHandlerFallsBackToTheDefaultRange(t *testing.T) {
	f := newReportFixture(t)
	rec := httptest.NewRecorder()
	NewOverviewHandler(f.service).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/x?from=2026-11-09&to=2026-11-01", nil))
	def := DefaultDateRange(time.Now())
	body := rec.Body.String()
	if rec.Code != http.StatusOK || !strings.Contains(body, `"from":"`+def.FromDay()+`"`) || !strings.Contains(body, `"to":"`+def.ToDay()+`"`) {
		t.Fatalf("status %d body %.200s, want the default range %s..%s", rec.Code, body, def.FromDay(), def.ToDay())
	}
}

// exportCSV runs an export handler and returns its records; the file must be
// a complete CSV with BOM and the expected download name.
func exportCSV(t *testing.T, h http.Handler, target, filename string) [][]string {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Disposition") != "attachment; filename="+filename {
		t.Fatalf("export status %d, Content-Disposition %q, body %.200s", rec.Code, rec.Header().Get("Content-Disposition"), rec.Body.String())
	}
	body, ok := strings.CutPrefix(rec.Body.String(), "\xEF\xBB\xBF")
	if !ok {
		t.Fatalf("export has no UTF-8 BOM: %.40q", rec.Body.String())
	}
	records, err := csv.NewReader(strings.NewReader(body)).ReadAll()
	if err != nil {
		t.Fatalf("export is not CSV: %v", err)
	}
	if len(records) == 0 {
		t.Fatal("export has no header row")
	}
	return records
}
