// Package user serves the Sunner directory reads (F005 A2 recipient and
// mention search).
package user

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Search limits (F005 § 4.6).
const (
	SearchDefaultLimit = 10 // RECIPIENT_SEARCH_LIMIT
	SearchMaxLimit     = 20
	// SearchMaxQueryChars caps the query; longer input is cut, never refused.
	SearchMaxQueryChars = 100
)

// UserSearcher runs SearchUsers (*db.Queries).
type UserSearcher interface {
	SearchUsers(ctx context.Context, arg db.SearchUsersParams) ([]db.SearchUsersRow, error)
}

// SearchHandler serves GET /api/v1/users/search?q=&limit= (F005 A2).
type SearchHandler struct {
	queries UserSearcher
}

// NewSearchHandler wires the queries.
func NewSearchHandler(queries UserSearcher) SearchHandler { return SearchHandler{queries: queries} }

// SunnerResult is one row of the recipient / mention list (avatar, name, unit).
type SunnerResult struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	UnitCode  *string   `json:"unitCode"`
	UnitName  *string   `json:"unitName"`
}

// ServeHTTP matches q (case-insensitive, anywhere in name or email; empty q
// lists the first Sunners by name) and never returns the caller (BR-001). No
// match answers an empty list.
func (h SearchHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "user search handler used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	query := r.URL.Query()
	ctx, cancel := dbx.RequestContext(r.Context())
	defer cancel()
	rows, err := h.queries.SearchUsers(ctx, db.SearchUsersParams{
		ViewerID: viewer.UserID,
		Pattern:  dbx.ContainsPattern(searchTerm(query.Get("q"))),
		RowLimit: searchLimit(query.Get("limit")),
	})
	if err != nil {
		slog.ErrorContext(r.Context(), "search users", "error", err)
		httpx.WriteInternalError(w)
		return
	}
	results := make([]SunnerResult, len(rows))
	for i, row := range rows {
		results[i] = SunnerResult{ID: row.ID, Name: row.Name, AvatarURL: row.AvatarUrl, UnitCode: row.UnitCode, UnitName: row.UnitName}
	}
	httpx.WriteJSON(w, http.StatusOK, results)
}

// searchTerm trims q and keeps at most SearchMaxQueryChars code points.
func searchTerm(raw string) string {
	term := strings.TrimSpace(strings.ReplaceAll(raw, "\x00", ""))
	if utf8.RuneCountInString(term) > SearchMaxQueryChars {
		term = string([]rune(term)[:SearchMaxQueryChars])
	}
	return term
}

// searchLimit is limit clamped to 1..SearchMaxLimit (default SearchDefaultLimit).
func searchLimit(raw string) int32 {
	n, err := strconv.Atoi(raw)
	switch {
	case err != nil || n <= 0:
		return SearchDefaultLimit
	case n > SearchMaxLimit:
		return SearchMaxLimit
	}
	return int32(n)
}
