package admin

import (
	"fmt"
	"strconv"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// CSV columns: the tables' columns with the design's English labels (D007),
// Actions left out (US006). Values equal what the tables show (SC-002).
var (
	overviewCSVHeader = []string{
		"No", "Unit", "Total member", "Total sent kudos", "Total received kudos",
		"Total users with at least one kudo", "Total received secret box",
	}
	usersCSVHeader = []string{
		"ID", "User", "Email", "Sent Kudos", "Received Kudos", "Total Heart", "Level",
		"Number of Badges", "Time to get 6 Badges", "Last Logged in", "Role",
	}
)

const (
	overviewAllLabel = "All"
	shortIDLength    = 8                  // D010: the ID column shows the first 8 characters
	lastLoginLayout  = "2006-01-02 15:04" // report time zone
)

// overviewCSVRecords: All first with a blank No, then units numbered from 1
// under their code, as the table shows them.
func overviewCSVRecords(o Overview) [][]string {
	records := make([][]string, len(o.Rows))
	for i, row := range o.Rows {
		no, unit := "", overviewAllLabel
		if row.UnitCode != nil {
			no, unit = strconv.Itoa(i), csvText(*row.UnitCode)
		}
		records[i] = []string{
			no, unit, itoa32(row.TotalMembers), itoa32(row.KudosSent), itoa32(row.KudosReceived),
			itoa32(row.UsersWithKudo), itoa32(row.SecretBoxes),
		}
	}
	return records
}

// usersCSVRecords: one line per Sunner; name and email go through csvText
// (BR-004); an empty cell where the table shows a dash.
func usersCSVRecords(users []DirectoryUser) [][]string {
	records := make([][]string, len(users))
	for i, u := range users {
		level, sixBadges, lastLogin := "", "", ""
		if u.Level != nil {
			level = string(*u.Level) + " Hero"
		}
		if u.TimeToSixBadgesSeconds != nil {
			sixBadges = formatBadgeDuration(*u.TimeToSixBadgesSeconds)
		}
		if u.LastLoginAt != nil {
			lastLogin = u.LastLoginAt.In(reportLocation).Format(lastLoginLayout)
		}
		records[i] = []string{
			u.ID.String()[:shortIDLength], csvText(u.Name), csvText(u.Email),
			itoa32(u.KudosSent), itoa32(u.KudosReceived), strconv.FormatInt(u.TotalHeart, 10), level,
			itoa32(u.Badges), sixBadges, lastLogin, roleLabel(u.Role),
		}
	}
	return records
}

// formatBadgeDuration writes a duration as days, hours and minutes, leading
// zero units left out: "2d 5h 0m", "3h 12m", "45m".
func formatBadgeDuration(seconds int64) string {
	d := time.Duration(seconds) * time.Second
	days, hours, minutes := int64(d/(24*time.Hour)), int64(d%(24*time.Hour)/time.Hour), int64(d%time.Hour/time.Minute)
	switch {
	case days > 0:
		return fmt.Sprintf("%dd %dh %dm", days, hours, minutes)
	case hours > 0:
		return fmt.Sprintf("%dh %dm", hours, minutes)
	default:
		return fmt.Sprintf("%dm", minutes)
	}
}

func roleLabel(role db.UserRole) string {
	if role == db.UserRoleAdmin {
		return "Admin"
	}
	return "User"
}

func itoa32(n int32) string { return strconv.FormatInt(int64(n), 10) }
