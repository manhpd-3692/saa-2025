package main

import (
	"net/http"
	"net/http/httptest"
	"regexp"
	"slices"
	"strings"
	"testing"
)

// publicAPIRoutes is the explicit allow-list of /api/v1 patterns that may
// answer without a token. Adding one is a contract change made in the F002
// spec first (route classes, N09); everything else under /api/v1 must be
// IDENTITY, PROFILE or ADMIN.
var publicAPIRoutes = []string{
	"GET /api/v1/events/current",
}

// patternRecorder remembers every pattern a registration mounts.
type patternRecorder struct {
	mux      routeMux
	patterns *[]string
}

func (r patternRecorder) Handle(pattern string, handler http.Handler) {
	*r.patterns = append(*r.patterns, pattern)
	r.mux.Handle(pattern, handler)
}

var wildcardSegment = regexp.MustCompile(`\{[^}]*\}`)

// unauthenticatedAPIRoutes mounts the registrations behind the real router and
// returns every /api/v1 pattern (outside publicAPIRoutes) that does NOT answer
// 401 to a request without a token — a route that skipped d.Routes.*.
func unauthenticatedAPIRoutes(t *testing.T, registrations []routeRegistration) (violations []string, checked int) {
	t.Helper()
	deps, _, _ := assembledDeps(t)
	var patterns []string
	recorded := make([]routeRegistration, len(registrations))
	for i, register := range registrations {
		recorded[i] = func(mux routeMux, d apiDeps) { register(patternRecorder{mux, &patterns}, d) }
	}
	router := newRouter(deps, recorded)

	for _, pattern := range patterns {
		method, path, hasMethod := strings.Cut(pattern, " ")
		if !hasMethod {
			method, path = http.MethodGet, pattern
		}
		if !strings.HasPrefix(path, "/api/v1/") || slices.Contains(publicAPIRoutes, pattern) {
			continue
		}
		path = wildcardSegment.ReplaceAllStringFunc(strings.ReplaceAll(path, "{$}", ""), func(string) string { return "x" })
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, httptest.NewRequest(method, path, nil))
		checked++
		if rec.Code != http.StatusUnauthorized {
			violations = append(violations, pattern)
		}
	}
	return violations, checked
}

// W8 / N09: "a new route defaults to PROFILE" is enforced, not just documented.
func TestEveryRegisteredAPIRouteRequiresAToken(t *testing.T) {
	violations, _ := unauthenticatedAPIRoutes(t, routeRegistrations)
	if len(violations) > 0 {
		t.Fatalf("routes answer without a token (wrap them in d.Routes.Identity/Profile/Admin, or list them in publicAPIRoutes after a spec change): %v", violations)
	}
}

// The guard itself must fail on a leaked route and honour the allow-list,
// otherwise it passes vacuously while no /api/v1 route exists yet.
func TestRouteClassGuardCatchesUnprotectedRoutes(t *testing.T) {
	register := func(mux routeMux, d apiDeps) {
		mux.Handle("GET /api/v1/events/current", d.Routes.Public(ok200))     // allow-listed
		mux.Handle("GET /api/v1/kudos/{id}", d.Routes.Profile(ok200))        // protected, wildcard
		mux.Handle("POST /api/v1/me/provision", d.Routes.Identity(ok200))    // protected
		mux.Handle("DELETE /api/v1/admin/users/{id}", d.Routes.Admin(ok200)) // protected
		mux.Handle("GET /api/v1/leaky", ok200)                               // forgot d.Routes.*
		mux.Handle("GET /api/v1/also-leaky", d.Routes.Public(ok200))         // Public outside the allow-list
		mux.Handle("GET /healthz", d.Routes.Public(ok200))                   // outside /api/v1: ignored
	}
	violations, checked := unauthenticatedAPIRoutes(t, []routeRegistration{register})

	want := []string{"GET /api/v1/leaky", "GET /api/v1/also-leaky"}
	slices.Sort(violations)
	slices.Sort(want)
	if !slices.Equal(violations, want) || checked != 5 {
		t.Fatalf("violations = %v (checked %d), want %v (checked 5)", violations, checked, want)
	}
}
