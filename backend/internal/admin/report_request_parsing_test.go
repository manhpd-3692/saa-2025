package admin

import (
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// 2026-11-28 01:30 in Ho Chi Minh City is still 2026-11-27 in UTC.
var parsingNow = time.Date(2026, 11, 27, 18, 30, 0, 0, time.UTC)

// FR-104, BR-006, D001, D009: the default is the last 30 days ending today in
// the report time zone; malformed, impossible or reversed ranges fall back.
func TestParseDateRangeDefaultsAndValidation(t *testing.T) {
	def := DefaultDateRange(parsingNow)
	if def.FromDay() != "2026-10-30" || def.ToDay() != "2026-11-28" {
		t.Fatalf("default range %s..%s, want 2026-10-30..2026-11-28", def.FromDay(), def.ToDay())
	}
	for _, c := range [][2]string{
		{"", ""}, {"bad", "2026-11-08"}, {"2026-11-01", ""}, {"2026-2-01", "2026-11-08"},
		{"2026-02-30", "2026-03-01"}, {"2026-11-09", "2026-11-08"}, {"2026-11-01T00:00", "2026-11-08"},
	} {
		if got := ParseDateRange(c[0], c[1], parsingNow); got != def {
			t.Errorf("ParseDateRange(%q, %q) = %s..%s, want the default", c[0], c[1], got.FromDay(), got.ToDay())
		}
	}
	one := ParseDateRange("2026-11-08", "2026-11-08", parsingNow)
	if one.FromDay() != "2026-11-08" || one.ToDay() != "2026-11-08" {
		t.Errorf("single-day range %s..%s", one.FromDay(), one.ToDay())
	}
}

// BR-001: both edge days count; the window is half-open at the next midnight (UTC+7).
func TestDateRangeWindowCoversWholeReportDays(t *testing.T) {
	start, end := ParseDateRange("2026-11-01", "2026-11-08", parsingNow).Window()
	if want := time.Date(2026, 10, 31, 17, 0, 0, 0, time.UTC); !start.Equal(want) {
		t.Errorf("window start %s, want %s", start.UTC(), want)
	}
	if want := time.Date(2026, 11, 8, 17, 0, 0, 0, time.UTC); !end.Equal(want) {
		t.Errorf("window end %s, want %s", end.UTC(), want)
	}
}

// A4 Request: unknown values are dropped, not errors; filters combine (BR-005).
func TestParseUserFilterDropsUnknownValues(t *testing.T) {
	f := ParseUserFilter(url.Values{"unit": {"not-a-uuid"}, "level": {"Mythic"}, "role": {"owner"}, "q": {"  "}})
	if f.UnitID != nil || f.Level != gamification.TierNone || f.Role != nil || f.Query != "" {
		t.Errorf("unknown values kept: %+v", f)
	}
	f = ParseUserFilter(url.Values{
		"unit": {"d0000000-0000-4000-8000-000000000001"}, "level": {"Legend"}, "role": {"admin"},
		"q": {" 50%_off " + strings.Repeat("x", 200)},
	})
	if f.UnitID == nil || f.Level != gamification.TierLegend || f.Role == nil || string(*f.Role) != "admin" {
		t.Errorf("valid filters dropped: %+v", f)
	}
	if !strings.HasPrefix(f.Query, "50%_off") || len([]rune(f.Query)) != maxQueryRunes {
		t.Errorf("query %q (%d runes)", f.Query, len([]rune(f.Query)))
	}
	p := f.countParams()
	if p.Pattern == nil || !strings.HasPrefix(*p.Pattern, `%50\%\_off`) || p.MinSenders == nil || *p.MinSenders != 21 {
		t.Errorf("count params %+v", p)
	}
}

func TestParsePagingDefaultsAndCaps(t *testing.T) {
	cases := []struct {
		values         url.Values
		page, pageSize int32
	}{
		{url.Values{}, 1, UsersPageSize},
		{url.Values{"page": {"0"}, "pageSize": {"-3"}}, 1, UsersPageSize},
		{url.Values{"page": {"x"}, "pageSize": {"8"}}, 1, 8},
		{url.Values{"page": {"3"}, "pageSize": {"5000"}}, 3, maxUserPageSize},
	}
	for _, c := range cases {
		if page, size := ParsePaging(c.values); page != c.page || size != c.pageSize {
			t.Errorf("ParsePaging(%v) = %d, %d; want %d, %d", c.values, page, size, c.page, c.pageSize)
		}
	}
}
