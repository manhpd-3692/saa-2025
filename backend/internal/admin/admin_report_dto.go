package admin

import (
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// OverviewRow is one Overview line (FR-101). The All row has no unit: its
// unit fields are null and it always comes first.
type OverviewRow struct {
	UnitID        *uuid.UUID `json:"unitId"`
	UnitCode      *string    `json:"unitCode"`
	UnitName      *string    `json:"unitName"`
	TotalMembers  int32      `json:"totalMembers"`  // current headcount, no window (BR-001)
	KudosSent     int32      `json:"kudosSent"`     // in the window, spam excluded (BR-002)
	KudosReceived int32      `json:"kudosReceived"` // in the window, spam excluded
	UsersWithKudo int32      `json:"usersWithKudo"` // sent or received at least one (D002)
	SecretBoxes   int32      `json:"secretBoxes"`   // granted in the window
}

// Overview is the A1 answer: the applied range (the default when the request
// had none or an invalid one, FR-104) and the rows, All first.
type Overview struct {
	From string        `json:"from"`
	To   string        `json:"to"`
	Rows []OverviewRow `json:"rows"`
}

// DirectoryUser is one user directory row (FR-201). Email is for admins only.
type DirectoryUser struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	Email         string    `json:"email"`
	AvatarURL     *string   `json:"avatarUrl"`
	UnitCode      *string   `json:"unitCode"`
	KudosSent     int32     `json:"kudosSent"`
	KudosReceived int32     `json:"kudosReceived"`
	TotalHeart    int64     `json:"totalHeart"` // weighted (BR-008)
	// Level is the F008 hero tier; null without public kudos received.
	Level  *gamification.HeroTier `json:"level"`
	Badges int32                  `json:"badges"` // distinct opened icons, 0-6 (ALG-003)
	// TimeToSixBadgesSeconds is null below six badges (DEC-003).
	TimeToSixBadgesSeconds *int64      `json:"timeToSixBadgesSeconds"`
	LastLoginAt            *time.Time  `json:"lastLoginAt"`
	Role                   db.UserRole `json:"role"` // display only (FR-206)
}

// Unit is a Unit filter choice (E02).
type Unit struct {
	ID   uuid.UUID `json:"id"`
	Code string    `json:"code"`
	Name string    `json:"name"`
}

// UserPage is the A4/A5 answer: one page of rows, the match count for the
// pager, the page actually shown (clamped) and the Unit filter choices.
type UserPage struct {
	Rows     []DirectoryUser `json:"rows"`
	Total    int32           `json:"total"`
	Page     int32           `json:"page"`
	PageSize int32           `json:"pageSize"`
	Units    []Unit          `json:"units"`
}

// directoryUsers maps query rows to the DTO: the tier through F008's
// HeroTierFor (one definition, RISK-01) and -1 seconds to "below six".
func directoryUsers(rows []db.AdminListUsersRow) []DirectoryUser {
	out := make([]DirectoryUser, len(rows))
	for i, r := range rows {
		u := DirectoryUser{
			ID: r.ID, Name: r.Name, Email: r.Email, AvatarURL: r.AvatarUrl, UnitCode: r.UnitCode,
			KudosSent: r.KudosSent, KudosReceived: r.KudosReceived, TotalHeart: r.TotalHeart,
			Badges: r.Badges, LastLoginAt: r.LastLoginAt, Role: r.Role,
		}
		if tier := gamification.HeroTierFor(int(r.Senders)); tier != gamification.TierNone {
			u.Level = &tier
		}
		if r.SixBadgesSeconds >= 0 {
			seconds := r.SixBadgesSeconds
			u.TimeToSixBadgesSeconds = &seconds
		}
		out[i] = u
	}
	return out
}
