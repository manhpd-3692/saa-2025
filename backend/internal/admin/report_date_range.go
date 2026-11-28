// Package admin serves the admin Overview and user directory reads and their
// CSV exports (F010). Every route is ADMIN class: PROFILE + RequireAdmin.
package admin

import (
	"time"
	_ "time/tzdata" // the report zone must load even where the host has no zoneinfo
)

// Report configuration (technical-spec § 4.6).
const (
	reportTimeZone           = "Asia/Ho_Chi_Minh" // D009: where a report day starts and ends
	overviewDefaultRangeDays = 30                 // FR-104: last 30 days ending today
	reportDateLayout         = "2006-01-02"       // YYYY-MM-DD in the address and the JSON
)

var reportLocation = mustLoadLocation(reportTimeZone)

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		panic("admin: load report time zone: " + err.Error())
	}
	return loc
}

// DateRange is a whole-day report range, both days included (BR-001). From and
// To are midnights in the report time zone.
type DateRange struct {
	From, To time.Time
}

// ReportToday is the calendar day of now in the report time zone.
func ReportToday(now time.Time) time.Time {
	y, m, d := now.In(reportLocation).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, reportLocation)
}

// DefaultDateRange is the last 30 days ending today (D001, FR-104).
func DefaultDateRange(now time.Time) DateRange {
	today := ReportToday(now)
	return DateRange{From: today.AddDate(0, 0, -(overviewDefaultRangeDays - 1)), To: today}
}

// ParseDateRange reads the `from` and `to` query values. A missing or
// malformed day, or a start after the end, gives the default range (FR-104,
// BR-006): never an error.
func ParseDateRange(fromRaw, toRaw string, now time.Time) DateRange {
	from, okFrom := parseReportDay(fromRaw)
	to, okTo := parseReportDay(toRaw)
	if !okFrom || !okTo || from.After(to) {
		return DefaultDateRange(now)
	}
	return DateRange{From: from, To: to}
}

// ParseOptionalDateRange reads an optional `from`/`to` filter (F011 BR-005):
// ok is false — no date filter — when either day is missing or malformed or
// the start is after the end; never an error.
func ParseOptionalDateRange(fromRaw, toRaw string) (DateRange, bool) {
	from, okFrom := parseReportDay(fromRaw)
	to, okTo := parseReportDay(toRaw)
	if !okFrom || !okTo || from.After(to) {
		return DateRange{}, false
	}
	return DateRange{From: from, To: to}, true
}

// parseReportDay accepts exactly YYYY-MM-DD naming a real day ("2026-02-30" and
// "2026-2-1" are rejected).
func parseReportDay(raw string) (time.Time, bool) {
	day, err := time.ParseInLocation(reportDateLayout, raw, reportLocation)
	if err != nil || day.Format(reportDateLayout) != raw {
		return time.Time{}, false
	}
	return day, true
}

// Window is the half-open activity window [start of From, start of the day
// after To) in the report time zone (BR-001).
func (r DateRange) Window() (start, end time.Time) {
	return r.From, r.To.AddDate(0, 0, 1)
}

// FromDay and ToDay format the range days as YYYY-MM-DD.
func (r DateRange) FromDay() string { return r.From.Format(reportDateLayout) }
func (r DateRange) ToDay() string   { return r.To.Format(reportDateLayout) }
