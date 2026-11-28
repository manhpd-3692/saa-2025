package moderation

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/admin"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// Review configuration (technical-spec § 4.6).
const (
	ReviewPageSize     = 20  // REVIEW_PAGE_SIZE (FR-102)
	ExcerptLength      = 240 // EXCERPT_LENGTH: fills the four-line Content cell of Figma 722:16251
	PeopleOptionsLimit = 20  // PEOPLE_OPTIONS_LIMIT (BR-009)
	maxQueryRunes      = 100 // longer search text is cut, never refused
)

// ReviewFilter is BR-001: every present filter narrows the list (AND); Query
// is a case-insensitive "contains" on the title or the body's visible text.
// The zero value lists every kudo. Dates are ignored together (BR-005).
type ReviewFilter struct {
	SenderID   *uuid.UUID
	ReceiverID *uuid.UUID
	Status     *db.KudoStatus
	Dates      *admin.DateRange // whole days in the report time zone, both included
	Query      string
}

// ParseReviewFilter reads `sender`, `receiver`, `status`, `from`, `to` and
// `q`. Unknown or malformed values are dropped, not errors (A1 Request); a
// date range with a bad or missing day, or a start after its end, is ignored.
func ParseReviewFilter(values url.Values) ReviewFilter {
	var f ReviewFilter
	if id, err := uuid.Parse(values.Get("sender")); err == nil {
		f.SenderID = &id
	}
	if id, err := uuid.Parse(values.Get("receiver")); err == nil {
		f.ReceiverID = &id
	}
	if status := db.KudoStatus(values.Get("status")); status.Valid() {
		f.Status = &status
	}
	if rng, ok := admin.ParseOptionalDateRange(values.Get("from"), values.Get("to")); ok {
		f.Dates = &rng
	}
	f.Query = cutQuery(values.Get("q"))
	return f
}

// ParseReviewPage reads the 1-based `page` (default 1); Go clamps it to the
// last page once the total is known.
func ParseReviewPage(values url.Values) int32 {
	if n, err := strconv.ParseInt(values.Get("page"), 10, 32); err == nil && n >= 1 {
		return int32(n)
	}
	return 1
}

// cutQuery trims the search text and keeps at most maxQueryRunes of it. NUL
// bytes and invalid UTF-8 are dropped first: Postgres refuses them in a text
// parameter, and bad input is dropped, never a 500 (A1 Request, reviewer W1).
func cutQuery(raw string) string {
	q := strings.TrimSpace(strings.ToValidUTF8(strings.ReplaceAll(raw, "\x00", ""), ""))
	if runes := []rune(q); len(runes) > maxQueryRunes {
		q = string(runes[:maxQueryRunes])
	}
	return q
}

// pattern is the escaped ILIKE pattern of a search text, nil without one.
func pattern(q string) *string {
	if q == "" {
		return nil
	}
	p := dbx.ContainsPattern(q)
	return &p
}

// countParams are the AdminCountKudos arguments of the filter.
func (f ReviewFilter) countParams() db.AdminCountKudosParams {
	p := db.AdminCountKudosParams{SenderID: f.SenderID, ReceiverID: f.ReceiverID, Status: f.Status, Pattern: pattern(f.Query)}
	if f.Dates != nil {
		start, end := f.Dates.Window()
		p.WindowStart, p.WindowEnd = &start, &end
	}
	return p
}

// listParams are the AdminListKudos arguments of the filter for one page.
func (f ReviewFilter) listParams(page int32) db.AdminListKudosParams {
	c := f.countParams()
	return db.AdminListKudosParams{
		SenderID: c.SenderID, ReceiverID: c.ReceiverID, Status: c.Status,
		WindowStart: c.WindowStart, WindowEnd: c.WindowEnd, Pattern: c.Pattern,
		RowLimit: ReviewPageSize, RowOffset: (page - 1) * ReviewPageSize,
	}
}
