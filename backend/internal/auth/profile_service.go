package auth

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// Profile outcomes.
var (
	// ErrIneligibleIdentity: no verified Google identity for the token's email (BR-003, C08).
	ErrIneligibleIdentity = errors.New("identity is not a verified company Google account")
	// ErrProfileNotFound: the caller has no users row.
	ErrProfileNotFound = errors.New("profile not found")
	// ErrProfileConflict: a users row under another id already owns the email
	// (an auth user re-created with a new sub); support must reconcile (W3).
	ErrProfileConflict = errors.New("email already belongs to another profile")
)

// usersEmailUnique is the unique constraint on users.email (migration users_units).
const usersEmailUnique = "users_email_key"

// Me is the A8 body (also returned by A9): role only from users.role (R05).
type Me struct {
	ID        uuid.UUID   `json:"id"`
	Email     string      `json:"email"`
	Name      string      `json:"name"`
	AvatarURL *string     `json:"avatarUrl"`
	Role      db.UserRole `json:"role"`
	Unit      *MeUnit     `json:"unit"`
}

// MeUnit is the caller's unit (Codex R15).
type MeUnit struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
	Code string    `json:"code"`
}

// ProfileService is F002 A8/A9.
type ProfileService struct {
	pool        dbx.TxBeginner
	queries     *db.Queries
	identities  IdentityReader
	adminEmails []string // lower-cased ADMIN_EMAILS (G02)
}

// NewProfileService wires the pool, the identity reader and the admin list.
func NewProfileService(pool dbx.TxBeginner, queries *db.Queries, identities IdentityReader, adminEmails []string) *ProfileService {
	return &ProfileService{pool: pool, queries: queries, identities: identities, adminEmails: adminEmails}
}

// Provision is A9: the token already passed A0 (company domain, Google
// provider); here the Google identity stored by Supabase Auth must say the
// same email is verified (C08: user_metadata is client-writable and never
// trusted). Name and avatar come from that identity, falling back to the
// email's local part. Role is admin on insert for ADMIN_EMAILS and only ever
// promoted later (BR-001). Idempotent: one row per Sunner. An email already
// owned by another users row is ErrProfileConflict, not an internal error.
func (s *ProfileService) Provision(ctx context.Context, identity VerifiedIdentity) (Me, error) {
	google, err := s.identities.GoogleIdentity(ctx, identity.UserID)
	switch {
	case errors.Is(err, ErrNoGoogleIdentity):
		return Me{}, ErrIneligibleIdentity
	case err != nil:
		return Me{}, fmt.Errorf("verify Google identity: %w", err)
	case !google.EmailVerified || google.Email != identity.Email || !hasAllowedDomain(google.Email):
		return Me{}, ErrIneligibleIdentity
	}

	name := google.Name
	if name == "" {
		name, _, _ = strings.Cut(identity.Email, "@")
	}
	var avatar *string
	if google.AvatarURL != "" {
		avatar = &google.AvatarURL
	}
	role := db.UserRoleUser
	if slices.Contains(s.adminEmails, identity.Email) {
		role = db.UserRoleAdmin
	}

	var me Me
	err = dbx.WithTx(ctx, s.pool, func(ctx context.Context, tx pgx.Tx) error {
		q := db.New(tx)
		if err := q.UpsertProfileOnSignIn(ctx, db.UpsertProfileOnSignInParams{
			ID: identity.UserID, Email: identity.Email, Name: name, AvatarUrl: avatar, Role: role,
		}); err != nil {
			if dbx.IsConstraintViolation(err, dbx.UniqueViolation, usersEmailUnique) {
				return ErrProfileConflict
			}
			return fmt.Errorf("upsert profile: %w", err)
		}
		row, err := q.GetMe(ctx, identity.UserID)
		if err != nil {
			return fmt.Errorf("read provisioned profile: %w", err)
		}
		me = meFrom(row)
		return nil
	})
	return me, err
}

// Me is A8: the caller's own row with its unit.
func (s *ProfileService) Me(ctx context.Context, userID uuid.UUID) (Me, error) {
	ctx, cancel := dbx.RequestContext(ctx)
	defer cancel()
	row, err := s.queries.GetMe(ctx, userID)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		return Me{}, ErrProfileNotFound
	case err != nil:
		return Me{}, fmt.Errorf("read profile: %w", err)
	}
	return meFrom(row), nil
}

func meFrom(row db.GetMeRow) Me {
	me := Me{ID: row.ID, Email: row.Email, Name: row.Name, AvatarURL: row.AvatarUrl, Role: row.Role}
	if row.UnitID != nil && row.UnitName != nil && row.UnitCode != nil {
		me.Unit = &MeUnit{ID: *row.UnitID, Name: *row.UnitName, Code: *row.UnitCode}
	}
	return me
}
