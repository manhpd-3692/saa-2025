package auth

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// MeHandler serves F002 A8 (GET /api/v1/me, PROFILE) and A9
// (POST /api/v1/me/provision, the one IDENTITY-ONLY route).
type MeHandler struct {
	profiles *ProfileService
}

// NewMeHandler wires the profile service.
func NewMeHandler(profiles *ProfileService) MeHandler { return MeHandler{profiles: profiles} }

// Get answers the caller's own profile (A8).
func (h MeHandler) Get(w http.ResponseWriter, r *http.Request) {
	ac, ok := FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "GET /me used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	me, err := h.profiles.Me(r.Context(), ac.UserID)
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, me)
	case errors.Is(err, ErrProfileNotFound): // row deleted after the PROFILE check
		httpx.WriteError(w, http.StatusForbidden, CodeProfileNotProvisioned,
			"No profile exists for this account; provision it first.")
	default:
		httpx.LogRequestFailure(r, err, "read me", "user_id", ac.UserID)
		httpx.WriteInternalError(w)
	}
}

// Provision creates or refreshes the caller's profile (A9) and answers the A8 body.
func (h MeHandler) Provision(w http.ResponseWriter, r *http.Request) {
	identity, ok := IdentityFromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "provision used outside the IDENTITY chain")
		httpx.WriteInternalError(w)
		return
	}
	me, err := h.profiles.Provision(r.Context(), identity)
	switch {
	case err == nil:
		httpx.WriteJSON(w, http.StatusOK, me)
	case errors.Is(err, ErrIneligibleIdentity):
		httpx.WriteError(w, http.StatusForbidden, CodeDomainNotAllowed,
			"Only verified Google accounts on @"+AllowedEmailDomain+" may use this service.")
	case errors.Is(err, ErrProfileConflict):
		// Support reconciles by the hash; the address itself stays out of logs.
		slog.ErrorContext(r.Context(), "provision profile: email owned by another users row",
			"user_id", identity.UserID, "email_sha256", emailHash(identity.Email))
		httpx.WriteError(w, http.StatusConflict, CodeProfileConflict,
			"This email already belongs to another profile. Please contact support.")
	default:
		httpx.LogRequestFailure(r, err, "provision profile", "user_id", identity.UserID)
		httpx.WriteInternalError(w)
	}
}

// emailHash is a stable handle on an address that keeps it out of logs:
// support hashes the candidate users.email values to find the row.
func emailHash(email string) string {
	sum := sha256.Sum256([]byte(email))
	return hex.EncodeToString(sum[:8])
}
