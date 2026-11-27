package httpx

import (
	"errors"
	"net/http"
)

// Middleware wraps a handler with cross-cutting behavior.
type Middleware func(http.Handler) http.Handler

// RouteClasses puts every route into exactly one class (F002 § 4.4 A0, Codex N09).
// CORS wraps the whole mux outside these chains.
//
//	PUBLIC    handler only — no JWT read, no profile load (GET /api/v1/events/current)
//	IDENTITY  verified JWT + eligible identity, no profile (POST /api/v1/me/provision)
//	PROFILE   IDENTITY + existing users row → AuthContext (every other /api/v1/* route)
//	ADMIN     PROFILE + RequireAdmin (/api/v1/admin/*)
//
// A new route defaults to Profile; adding one to Public or Identity is a
// contract change made in the F002 spec first.
type RouteClasses struct {
	identity Middleware
	profile  Middleware
	admin    Middleware
}

// NewRouteClasses builds the class wrappers from the auth chains. The profile
// chain must include identity verification itself; admin is applied inside it.
func NewRouteClasses(identity, profile, requireAdmin Middleware) (RouteClasses, error) {
	if identity == nil || profile == nil || requireAdmin == nil {
		return RouteClasses{}, errors.New("httpx: every route-class middleware is required")
	}
	return RouteClasses{identity: identity, profile: profile, admin: requireAdmin}, nil
}

// Public registers a handler without any auth chain.
func (RouteClasses) Public(h http.Handler) http.Handler { return h }

// Identity requires a verified, eligible JWT but no profile row.
func (c RouteClasses) Identity(h http.Handler) http.Handler { return c.identity(h) }

// Profile requires a verified JWT and an existing profile (role loaded from users).
func (c RouteClasses) Profile(h http.Handler) http.Handler { return c.profile(h) }

// Admin requires a profile whose stored role is admin.
func (c RouteClasses) Admin(h http.Handler) http.Handler { return c.profile(c.admin(h)) }
