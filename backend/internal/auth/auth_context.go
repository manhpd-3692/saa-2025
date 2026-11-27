// Package auth verifies Supabase access tokens and puts the caller's identity
// and stored role on the request context (F002 A0, A7; Codex R05, R21, N09).
package auth

import (
	"context"
	"slices"
	"strings"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// AllowedEmailDomain is the only domain that may sign in (G01, BR-003). Fixed by
// the spec, not configuration.
const AllowedEmailDomain = "sun-asterisk.com"

// requiredProvider is the only accepted identity provider (Codex R21).
const requiredProvider = "google"

// VerifiedIdentity is what a verified Supabase access token says about the
// caller. It is the only source of identity: body fields, headers or query
// params claiming a user id are never trusted.
type VerifiedIdentity struct {
	UserID    uuid.UUID // `sub` = auth.users.id = users.id
	Email     string    // lower-cased `email`
	Provider  string    // `app_metadata.provider`
	Providers []string  // `app_metadata.providers`, empty when absent
	Name      string    // `user_metadata.full_name` or `name`
	AvatarURL string    // `user_metadata.avatar_url` or `picture`
}

// IsEligible reports whether the identity may use the API: a Google sign-in
// with an email on the company domain, compared case-insensitively (BR-003,
// Codex R21). It reads only server-controlled claims: `email` and
// `app_metadata` (provider; providers, when present, must be only Google).
// `user_metadata.email_verified` is client-writable (auth.updateUser) and is
// never trusted here; POST /api/v1/me/provision verifies `email_verified`
// server-side from auth.identities (gap log C08).
func (i VerifiedIdentity) IsEligible() bool {
	return i.Provider == requiredProvider &&
		slices.IndexFunc(i.Providers, func(p string) bool { return p != requiredProvider }) < 0 &&
		hasAllowedDomain(i.Email)
}

func hasAllowedDomain(email string) bool {
	at := strings.LastIndexByte(email, '@')
	return at > 0 && strings.EqualFold(email[at+1:], AllowedEmailDomain)
}

// AuthContext is the per-request caller of PROFILE and ADMIN routes. Role is
// read from users.role on every request (BR-004); token claims never set it.
type AuthContext struct {
	UserID uuid.UUID
	Email  string
	Role   db.UserRole
}

// IsAdmin reports whether the stored role is admin.
func (a AuthContext) IsAdmin() bool { return a.Role == db.UserRoleAdmin }

type identityKey struct{}
type authContextKey struct{}

func withIdentity(ctx context.Context, identity VerifiedIdentity) context.Context {
	return context.WithValue(ctx, identityKey{}, identity)
}

func withAuthContext(ctx context.Context, ac AuthContext) context.Context {
	return context.WithValue(ctx, authContextKey{}, ac)
}

// IdentityFromContext returns the verified identity set by the IDENTITY,
// PROFILE and ADMIN chains.
func IdentityFromContext(ctx context.Context) (VerifiedIdentity, bool) {
	identity, ok := ctx.Value(identityKey{}).(VerifiedIdentity)
	return identity, ok
}

// FromContext returns the AuthContext set by the PROFILE and ADMIN chains.
func FromContext(ctx context.Context) (AuthContext, bool) {
	ac, ok := ctx.Value(authContextKey{}).(AuthContext)
	return ac, ok
}
