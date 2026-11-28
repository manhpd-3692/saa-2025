//go:build integration

package admin

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

func userPage(t *testing.T, f *reportFixture, query string) UserPage {
	t.Helper()
	values, err := url.ParseQuery(query)
	if err != nil {
		t.Fatal(err)
	}
	page, size := ParsePaging(values)
	out, err := f.service.Users(context.Background(), ParseUserFilter(values), page, size)
	if err != nil {
		t.Fatal(err)
	}
	return out
}

func emailsOf(rows []DirectoryUser) []string {
	out := make([]string, len(rows))
	for i, r := range rows {
		out[i] = r.Email
	}
	slices.Sort(out)
	return out
}

func rowOf(t *testing.T, rows []DirectoryUser, id uuid.UUID) DirectoryUser {
	t.Helper()
	for _, r := range rows {
		if r.ID == id {
			return r
		}
	}
	t.Fatalf("user %s not listed", id)
	return DirectoryUser{}
}

// SC-003, BR-005, FR-403: Unit + Role + search narrow together; the table,
// the suggestions (pageSize=8) and the export hold the same set; `%` and `_`
// are plain text; a formula-like name is neutralised in the file (SC-005).
func TestUserFiltersTableSuggestionsAndExportAgree(t *testing.T) {
	f := newReportFixture(t)
	unit, _ := f.unit()
	formula := f.sunner("=SUM(A1) Tester", &unit, false)
	dora := f.sunner("Dora 50%_off", &unit, false)
	f.sunner("Dora Admin", &unit, true)
	f.sunner("Edgar 50 off", &unit, false)

	base := "unit=" + unit.String()
	table := userPage(t, f, base+"&role=user&q=DORA")
	suggest := userPage(t, f, base+"&role=user&q=DORA&pageSize=8")
	if table.Total != 1 || len(table.Rows) != 1 || table.Rows[0].ID != dora {
		t.Fatalf("table %+v, want only Dora 50%%_off", table.Rows)
	}
	if !slices.Equal(emailsOf(suggest.Rows), emailsOf(table.Rows)) {
		t.Errorf("suggestions %v differ from the table %v", emailsOf(suggest.Rows), emailsOf(table.Rows))
	}
	records := exportCSV(t, NewUsersExportHandler(f.service), "/export?"+base+"&role=user&q=DORA",
		"saa-users-"+ReportToday(time.Now()).Format(reportDateLayout)+".csv")
	if len(records) != 2 || records[1][2] != table.Rows[0].Email || records[1][0] != dora.String()[:8] {
		t.Errorf("export %q, want the table's one row", records)
	}

	if literal := userPage(t, f, base+"&q=50%25_"); len(literal.Rows) != 1 || literal.Rows[0].ID != dora {
		t.Errorf("q=50%%_ matched %v, want only Dora 50%%_off (wildcards are plain text)", emailsOf(literal.Rows))
	}
	if admins := userPage(t, f, base+"&role=admin"); admins.Total != 1 || admins.Rows[0].Name != "Dora Admin" {
		t.Errorf("role=admin rows %v", emailsOf(admins.Rows))
	}

	all := exportCSV(t, NewUsersExportHandler(f.service), "/export?"+base, "saa-users-"+ReportToday(time.Now()).Format(reportDateLayout)+".csv")
	if len(all) != 5 {
		t.Fatalf("unit export has %d rows, want header + 4", len(all))
	}
	for _, rec := range all[1:] {
		if rec[0] == formula.String()[:8] && rec[1] != "'=SUM(A1) Tester" {
			t.Errorf("formula name exported as %q, want a leading apostrophe", rec[1])
		}
	}
	if units := table.Units; !slices.ContainsFunc(units, func(u Unit) bool { return u.ID == unit }) {
		t.Errorf("Unit choices miss the test unit")
	}
}

// FR-204, D013: 20 a page by default, name order, a page past the end shows the last page.
func TestUserPagingClampsToTheLastPage(t *testing.T) {
	f := newReportFixture(t)
	unit, _ := f.unit()
	for _, name := range []string{"Paging Cara", "Paging Anh", "Paging Binh"} {
		f.sunner(name, &unit, false)
	}
	second := userPage(t, f, "unit="+unit.String()+"&pageSize=2&page=2")
	beyond := userPage(t, f, "unit="+unit.String()+"&pageSize=2&page=9")
	first := userPage(t, f, "unit="+unit.String())
	if second.Total != 3 || len(second.Rows) != 1 || second.Rows[0].Name != "Paging Cara" {
		t.Errorf("page 2 %+v", second)
	}
	if beyond.Page != 2 || len(beyond.Rows) != 1 {
		t.Errorf("page 9 answered page %d with %d rows, want the last page 2", beyond.Page, len(beyond.Rows))
	}
	if first.PageSize != UsersPageSize || first.Rows[0].Name != "Paging Anh" || first.Rows[2].Name != "Paging Cara" {
		t.Errorf("first page size %d order %v", first.PageSize, first.Rows)
	}
}

// SC-007, BR-008, ALG-003, FR-207: Total Heart is the weighted total over
// public received kudos (1 + 2 = 3, the spam kudo's heart left out) and stays
// after the campaign is deleted; 7 opened boxes with 5 icons = 5 badges and no
// time; six icons give the time from the first open to the sixth icon; Level
// is the F008 tier and filters by it.
func TestUserDirectoryHeartsBadgesAndLevel(t *testing.T) {
	f := newReportFixture(t)
	unit, _ := f.unit()
	receiver := f.sunner("Hearts Receiver", &unit, false)
	s1 := f.sunner("Hearts Sender 1", &unit, false)
	s2 := f.sunner("Hearts Sender 2", &unit, false)
	s3 := f.sunner("Hearts Sender 3", &unit, false)
	kudo := f.kudo(s1, receiver, vn(11, 9, 0, 0), false)
	spam := f.kudo(s2, receiver, vn(11, 10, 0, 0), true)
	campaign := f.campaign(s1)
	f.heart(kudo, s2, 1, nil)
	f.heart(kudo, s3, 2, &campaign)
	f.heart(spam, s3, 5, nil)

	for i, icon := range []string{"REVIVAL", "REVIVAL", "STAY_GOLD", "STAY_GOLD", "ROOT_FURTHER", "FLOW_TO_HORIZON", "TOUCH_OF_LIGHT"} {
		f.box(receiver, i+1, vn(1, 0, 0, 0), icon, vn(1, i, 0, 0))
	}
	// s1 opens all six icons: first open at 01:00, sixth distinct icon at 03 02:00 (+49 h), then a repeat.
	for i, icon := range append(slices.Clone(allIcons), "REVIVAL") {
		f.box(s1, i+1, vn(1, 0, 0, 0), icon, vn(1, 1, 0, 0).Add(time.Duration(i)*49*time.Hour/5))
	}

	rows := userPage(t, f, "unit="+unit.String()).Rows
	got := rowOf(t, rows, receiver)
	if got.TotalHeart != 3 || got.KudosReceived != 1 || got.Badges != 5 || got.TimeToSixBadgesSeconds != nil {
		t.Errorf("receiver heart %d received %d badges %d time %v; want 3, 1, 5, nil", got.TotalHeart, got.KudosReceived, got.Badges, got.TimeToSixBadgesSeconds)
	}
	if got.Level == nil || *got.Level != gamification.TierNew {
		t.Errorf("receiver level %v, want New (one distinct sender of public kudos)", got.Level)
	}
	six := rowOf(t, rows, s1)
	if six.Badges != 6 || six.TimeToSixBadgesSeconds == nil || *six.TimeToSixBadgesSeconds != 49*3600 || six.KudosSent != 1 || six.Level != nil {
		t.Errorf("six-badge sender %+v, want 6 badges after 176400 s, 1 sent, no level", six)
	}

	f.exec(`delete from public.campaigns where id = $1`, campaign)
	if after := rowOf(t, userPage(t, f, "unit="+unit.String()).Rows, receiver); after.TotalHeart != 3 {
		t.Errorf("Total Heart after the campaign was deleted = %d, want 3 (BR-008)", after.TotalHeart)
	}

	rising := f.sunner("Rising Receiver", &unit, false)
	for i := range 5 {
		f.kudo(f.sunner("Rising Sender "+string(rune('A'+i)), nil, false), rising, vn(11, 9, i, 0), false)
	}
	filtered := userPage(t, f, "unit="+unit.String()+"&level=Rising")
	if filtered.Total != 1 || filtered.Rows[0].ID != rising || *filtered.Rows[0].Level != gamification.TierRising {
		t.Errorf("level=Rising rows %v, want only the receiver with five senders", emailsOf(filtered.Rows))
	}
}

// A4 over HTTP: JSON shape and the dropped-not-refused query values.
func TestUsersHandlerAnswersOnePage(t *testing.T) {
	f := newReportFixture(t)
	unit, _ := f.unit()
	f.sunner("Handler Sunner", &unit, false)
	rec := httptest.NewRecorder()
	NewUsersHandler(f.service).ServeHTTP(rec, httptest.NewRequest(http.MethodGet,
		"/x?unit="+unit.String()+"&level=bogus&role=root&page=-1", nil))
	body := rec.Body.String()
	for _, want := range []string{`"total":1`, `"page":1`, `"pageSize":20`, `"name":"Handler Sunner"`, `"timeToSixBadgesSeconds":null`, `"units":[`} {
		if !strings.Contains(body, want) {
			t.Errorf("status %d body %.300s misses %s", rec.Code, body, want)
		}
	}
}
