package admin

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// Paging and export sizes (technical-spec § 4.6, ALG-002).
const (
	UsersPageSize   = 20  // USERS_PAGE_SIZE (D013)
	maxUserPageSize = 100 // largest page a caller may ask for (the suggest list asks 8)
	exportPageSize  = 500 // rows read per page while an export streams
)

// Queries are the sqlc reads of admin_reports.sql (*db.Queries).
type Queries interface {
	AdminOverviewByUnit(ctx context.Context, arg db.AdminOverviewByUnitParams) ([]db.AdminOverviewByUnitRow, error)
	AdminOverviewAll(ctx context.Context, arg db.AdminOverviewAllParams) (db.AdminOverviewAllRow, error)
	AdminCountUsers(ctx context.Context, arg db.AdminCountUsersParams) (int32, error)
	AdminListUsers(ctx context.Context, arg db.AdminListUsersParams) ([]db.AdminListUsersRow, error)
	AdminListUnits(ctx context.Context) ([]db.AdminListUnitsRow, error)
}

// Service is AdminReportService (technical-spec § 4.1): the read model behind
// the Overview, the user directory, the suggestions and both exports, so the
// table, the suggestions and the file share one definition (SC-002, SC-003).
type Service struct {
	queries        Queries
	exportPageSize int32
}

// NewService wires the sqlc reads.
func NewService(queries Queries) *Service {
	return &Service{queries: queries, exportPageSize: exportPageSize}
}

// Overview is ALG-001 for one range: All first, then every unit by name.
func (s *Service) Overview(ctx context.Context, rng DateRange) (Overview, error) {
	start, end := rng.Window()
	all, err := s.queries.AdminOverviewAll(ctx, db.AdminOverviewAllParams{WindowStart: start, WindowEnd: end})
	if err != nil {
		return Overview{}, fmt.Errorf("overview all row: %w", err)
	}
	units, err := s.queries.AdminOverviewByUnit(ctx, db.AdminOverviewByUnitParams{WindowStart: start, WindowEnd: end})
	if err != nil {
		return Overview{}, fmt.Errorf("overview unit rows: %w", err)
	}
	rows := make([]OverviewRow, 0, len(units)+1)
	rows = append(rows, OverviewRow{
		TotalMembers: all.TotalMembers, KudosSent: all.KudosSent, KudosReceived: all.KudosReceived,
		UsersWithKudo: all.UsersWithKudo, SecretBoxes: all.SecretBoxes,
	})
	for _, u := range units {
		rows = append(rows, OverviewRow{
			UnitID: &u.UnitID, UnitCode: &u.UnitCode, UnitName: &u.UnitName,
			TotalMembers: u.TotalMembers, KudosSent: u.KudosSent, KudosReceived: u.KudosReceived,
			UsersWithKudo: u.UsersWithKudo, SecretBoxes: u.SecretBoxes,
		})
	}
	return Overview{From: rng.FromDay(), To: rng.ToDay(), Rows: rows}, nil
}

// Users is one page of the directory (A4, A5). A page past the last one shows
// the last page (edge case "page beyond the last").
func (s *Service) Users(ctx context.Context, filter UserFilter, page, pageSize int32) (UserPage, error) {
	total, err := s.queries.AdminCountUsers(ctx, filter.countParams())
	if err != nil {
		return UserPage{}, fmt.Errorf("count users: %w", err)
	}
	lastPage := max(1, (total+pageSize-1)/pageSize)
	page = min(max(page, 1), lastPage)

	params := filter.listParams(pageSize)
	params.RowOffset = (page - 1) * pageSize
	rows, err := s.queries.AdminListUsers(ctx, params)
	if err != nil {
		return UserPage{}, fmt.Errorf("list users: %w", err)
	}
	units, err := s.queries.AdminListUnits(ctx)
	if err != nil {
		return UserPage{}, fmt.Errorf("list units: %w", err)
	}
	out := UserPage{Rows: directoryUsers(rows), Total: total, Page: page, PageSize: pageSize, Units: make([]Unit, len(units))}
	for i, u := range units {
		out.Units[i] = Unit{ID: u.ID, Code: u.Code, Name: u.Name}
	}
	return out, nil
}

// userExportPages reads every match of the filter page by page in name order
// on the (name, id) keyset (A6), for streamCSV. A short page is the last one.
func (s *Service) userExportPages(filter UserFilter) func(ctx context.Context) ([]DirectoryUser, error) {
	var afterName *string
	var afterID *uuid.UUID
	done := false
	return func(ctx context.Context) ([]DirectoryUser, error) {
		if done {
			return nil, nil
		}
		params := filter.listParams(s.exportPageSize)
		params.AfterName, params.AfterID = afterName, afterID
		rows, err := s.queries.AdminListUsers(ctx, params)
		if err != nil {
			return nil, fmt.Errorf("list users for export: %w", err)
		}
		done = int32(len(rows)) < s.exportPageSize
		if n := len(rows); n > 0 {
			afterName, afterID = &rows[n-1].Name, &rows[n-1].ID
		}
		return directoryUsers(rows), nil
	}
}
