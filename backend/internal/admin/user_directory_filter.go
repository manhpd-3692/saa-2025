package admin

import (
	"net/url"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// maxQueryRunes caps the search text; longer input is cut, never refused.
const maxQueryRunes = 100

// UserFilter is BR-005: every present filter narrows the list (AND); Query is
// a case-insensitive "contains" on name or email. The zero value is no filter.
type UserFilter struct {
	UnitID *uuid.UUID
	Level  gamification.HeroTier // TierNone: any level
	Role   *db.UserRole
	Query  string
}

// ParseUserFilter reads `unit`, `level`, `role` and `q`. Unknown or malformed
// values are dropped, not errors (A4 Request).
func ParseUserFilter(values url.Values) UserFilter {
	var f UserFilter
	if id, err := uuid.Parse(values.Get("unit")); err == nil {
		f.UnitID = &id
	}
	if level := gamification.HeroTier(values.Get("level")); level != gamification.TierNone {
		if _, _, ok := gamification.HeroTierSenderRange(level); ok {
			f.Level = level
		}
	}
	if role := db.UserRole(values.Get("role")); role.Valid() {
		f.Role = &role
	}
	f.Query = strings.TrimSpace(values.Get("q"))
	if runes := []rune(f.Query); len(runes) > maxQueryRunes {
		f.Query = string(runes[:maxQueryRunes])
	}
	return f
}

// ParsePaging reads `page` (1-based, default 1) and `pageSize` (default 20,
// at most 100). Bad values fall back to the defaults.
func ParsePaging(values url.Values) (page, pageSize int32) {
	page, pageSize = 1, UsersPageSize
	if n, err := strconv.ParseInt(values.Get("page"), 10, 32); err == nil && n >= 1 {
		page = int32(n)
	}
	if n, err := strconv.ParseInt(values.Get("pageSize"), 10, 32); err == nil && n >= 1 {
		pageSize = int32(min(n, maxUserPageSize))
	}
	return page, pageSize
}

// countParams are the AdminCountUsers arguments of the filter.
func (f UserFilter) countParams() db.AdminCountUsersParams {
	p := db.AdminCountUsersParams{UnitID: f.UnitID, Role: f.Role}
	if f.Query != "" {
		pattern := dbx.ContainsPattern(f.Query)
		p.Pattern = &pattern
	}
	if lo, hi, ok := gamification.HeroTierSenderRange(f.Level); ok {
		p.MinSenders, p.MaxSenders = &lo, &hi
	}
	return p
}

// listParams are the AdminListUsers arguments of the filter with a page size;
// callers set the offset or the keyset.
func (f UserFilter) listParams(limit int32) db.AdminListUsersParams {
	c := f.countParams()
	return db.AdminListUsersParams{
		UnitID: c.UnitID, Role: c.Role, Pattern: c.Pattern,
		MinSenders: c.MinSenders, MaxSenders: c.MaxSenders, RowLimit: limit,
	}
}
