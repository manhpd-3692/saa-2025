package moderation

import (
	"net/url"
	"strings"
	"testing"
	"unicode/utf8"
)

// A1 Request / BR-005: unknown or malformed values are dropped, a date range
// with a bad or missing day or a start after its end is ignored, `q` is
// trimmed and cut, and the page defaults to 1.
func TestParseReviewFilterDropsInvalidValues(t *testing.T) {
	f := ParseReviewFilter(url.Values{
		"sender": {"not-a-uuid"}, "receiver": {"0b6d2c4e-1111-4222-8333-444455556666"},
		"status": {"pending"}, "from": {"2026-11-10"}, "to": {"2026-11-01"},
		"q": {"  " + strings.Repeat("ả", 150) + "  "},
	})
	if f.SenderID != nil || f.ReceiverID == nil || f.Status != nil || f.Dates != nil {
		t.Fatalf("filter = %+v; want only the receiver kept", f)
	}
	if n := utf8.RuneCountInString(f.Query); n != maxQueryRunes || strings.TrimSpace(f.Query) != f.Query {
		t.Fatalf("q kept %d runes (%q), want %d trimmed", n, f.Query[:8], maxQueryRunes)
	}

	// Reviewer W1: Postgres refuses NUL and invalid UTF-8 in a text parameter.
	if f := ParseReviewFilter(url.Values{"q": {" ph\x00i\xfe thường\x00 "}}); f.Query != "phi thường" {
		t.Fatalf("q with NUL / invalid UTF-8 = %q, want %q", f.Query, "phi thường")
	}
	if f := ParseReviewFilter(url.Values{"q": {"\x00\xff"}}); f.Query != "" {
		t.Fatalf("q of only NUL / invalid bytes = %q, want empty (no search)", f.Query)
	}

	f = ParseReviewFilter(url.Values{"status": {"spam"}, "from": {"2026-11-01"}, "to": {"2026-11-01"}})
	if f.Status == nil || *f.Status != "spam" || f.Dates == nil || f.Dates.FromDay() != "2026-11-01" || f.Dates.ToDay() != "2026-11-01" {
		t.Fatalf("status + one-day range = %+v", f)
	}
	for _, raw := range []url.Values{{"from": {"2026-11-01"}}, {"from": {"2026-2-1"}, "to": {"2026-02-03"}}, {"from": {"2026-02-30"}, "to": {"2026-03-01"}}} {
		if ParseReviewFilter(raw).Dates != nil {
			t.Errorf("range %v must be ignored", raw)
		}
	}
	for raw, want := range map[string]int32{"": 1, "0": 1, "-3": 1, "x": 1, "7": 7} {
		if got := ParseReviewPage(url.Values{"page": {raw}}); got != want {
			t.Errorf("page %q = %d, want %d", raw, got, want)
		}
	}
}

// The Content column keeps EXCERPT_LENGTH code points and marks a cut.
func TestExcerptCutsOnCodePoints(t *testing.T) {
	short := strings.Repeat("ư", ExcerptLength)
	if got := excerpt(short); got != short {
		t.Fatalf("text of exactly ExcerptLength was cut")
	}
	got := excerpt(short + "thêm")
	if utf8.RuneCountInString(got) != ExcerptLength+1 || !strings.HasSuffix(got, "…") || !utf8.ValidString(got) {
		t.Fatalf("excerpt = %d runes, valid %v", utf8.RuneCountInString(got), utf8.ValidString(got))
	}
}
