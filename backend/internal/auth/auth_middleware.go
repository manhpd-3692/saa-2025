package auth

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// Error codes owned by F002 (frontend switches on them; Codex R22).
const (
	CodeDomainNotAllowed      = "domain_not_allowed"
	CodeProfileNotProvisioned = "profile_not_provisioned"
	// CodeProfileConflict: another users row already owns the email (reviewer W3).
	CodeProfileConflict = "profile_conflict"
)

// TokenVerifier verifies a raw bearer token (JWTVerifier in production).
type TokenVerifier interface {
	Verify(ctx context.Context, raw string) (VerifiedIdentity, error)
}

// ProfileAuthReader loads the caller's stored role (*db.Queries in production).
type ProfileAuthReader interface {
	GetProfileAuth(ctx context.Context, id uuid.UUID) (db.GetProfileAuthRow, error)
}

// Middleware implements AuthMiddleware#verify (F002 § 4.4 A0). It runs after
// CORS, inside the IDENTITY, PROFILE and ADMIN route classes.
type Middleware struct {
	verifier TokenVerifier
	profiles ProfileAuthReader
}

// NewMiddleware wires the verifier and the profile reader.
func NewMiddleware(verifier TokenVerifier, profiles ProfileAuthReader) *Middleware {
	return &Middleware{verifier: verifier, profiles: profiles}
}

// RequireIdentity runs A0 steps 1–3 and 5: bearer token present (401),
// verified (401), eligible company Google identity (403 domain_not_allowed).
// No profile row is required (IDENTITY-ONLY class, e.g. provision).
func (m *Middleware) RequireIdentity(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := m.authenticate(w, r)
		if !ok {
			return
		}
		next.ServeHTTP(w, r.WithContext(withIdentity(r.Context(), identity)))
	})
}

// RequireProfile runs A0 steps 1–5: RequireIdentity plus the users row loaded
// by the verified `sub` (403 profile_not_provisioned when missing). The role on
// the context comes only from that row (Codex R05).
func (m *Middleware) RequireProfile(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		identity, ok := m.authenticate(w, r)
		if !ok {
			return
		}
		ctx, cancel := dbx.RequestContext(r.Context())
		row, err := m.profiles.GetProfileAuth(ctx, identity.UserID)
		cancel()
		switch {
		case errors.Is(err, pgx.ErrNoRows):
			httpx.WriteError(w, http.StatusForbidden, CodeProfileNotProvisioned,
				"No profile exists for this account; provision it first.")
			return
		case err != nil:
			slog.ErrorContext(r.Context(), "load profile role", "user_id", identity.UserID, "error", err)
			httpx.WriteInternalError(w)
			return
		}
		ctx = withIdentity(r.Context(), identity)
		ctx = withAuthContext(ctx, AuthContext{UserID: row.ID, Email: identity.Email, Role: row.Role})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// authenticate writes the 401/403 response itself and reports false on failure.
func (m *Middleware) authenticate(w http.ResponseWriter, r *http.Request) (VerifiedIdentity, bool) {
	raw, ok := bearerToken(r)
	if !ok {
		httpx.WriteUnauthorized(w)
		return VerifiedIdentity{}, false
	}
	identity, err := m.verifier.Verify(r.Context(), raw)
	if err != nil {
		slog.DebugContext(r.Context(), "reject access token", "error", err)
		httpx.WriteUnauthorized(w)
		return VerifiedIdentity{}, false
	}
	if !identity.IsEligible() {
		httpx.WriteError(w, http.StatusForbidden, CodeDomainNotAllowed,
			"Only verified Google accounts on @"+AllowedEmailDomain+" may use this service.")
		return VerifiedIdentity{}, false
	}
	return identity, true
}

// bearerToken reads `Authorization: Bearer <token>` (scheme case-insensitive).
func bearerToken(r *http.Request) (string, bool) {
	scheme, token, found := strings.Cut(r.Header.Get("Authorization"), " ")
	token = strings.TrimSpace(token)
	if !found || !strings.EqualFold(scheme, "Bearer") || token == "" {
		return "", false
	}
	return token, true
}
