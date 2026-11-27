// Package kudo writes and reads kudos (F005 create, F006 detail read).
package kudo

import (
	"regexp"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

// contentPolicy is ALG-001: only bold, italic, strike, ordered list,
// blockquote, paragraph, line break, http(s) links (rel noopener noreferrer)
// and mention spans carrying a user id survive; everything else is dropped,
// and script/style content is removed entirely. Built once; bluemonday
// policies are safe for concurrent use after construction.
var contentPolicy = newContentPolicy()

var mentionUserID = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

func newContentPolicy() *bluemonday.Policy {
	p := bluemonday.NewPolicy()
	p.AllowElements("p", "br", "strong", "b", "em", "i", "s", "strike", "del", "ol", "li", "blockquote")
	p.AllowAttrs("href").OnElements("a")
	p.AllowURLSchemes("http", "https")
	p.AllowRelativeURLs(false)
	p.RequireParseableURLs(true)
	p.RequireNoReferrerOnLinks(true)
	p.AddTargetBlankToFullyQualifiedLinks(true) // also adds rel="noopener"
	p.AllowAttrs("data-type").Matching(regexp.MustCompile(`^mention$`)).OnElements("span")
	p.AllowAttrs("data-id").Matching(mentionUserID).OnElements("span")
	return p
}

// sanitizeContent is the first step of every content rule (Codex R20): the
// required and length checks run on its output, which is what gets stored.
// bluemonday keeps a raw NUL byte in text, and Postgres refuses NUL in text
// columns (a 500 for plain user input), so NUL is dropped first (W1).
func sanitizeContent(html string) string {
	return contentPolicy.Sanitize(strings.ReplaceAll(html, "\x00", ""))
}
