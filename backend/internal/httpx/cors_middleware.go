package httpx

import (
	"net/http"
	"slices"
)

// Browser transport policy (F002 § 4.4 Transport, Codex R06). Exact values; do
// not widen without changing the contract first.
const (
	corsAllowMethods  = "GET, POST, PUT, PATCH, DELETE"
	corsAllowHeaders  = "Authorization, Content-Type, Idempotency-Key"
	corsExposeHeaders = "Content-Disposition"
	corsMaxAgeSeconds = "600"
)

// CORS wraps the whole mux and runs before any route-class chain, so a
// preflight never needs a JWT (Codex N09):
//   - allowed origins are an exact match against allowedOrigins; any other
//     origin gets no CORS headers and the browser blocks the call;
//   - an OPTIONS preflight is answered 204 here and never reaches a handler;
//   - no Access-Control-Allow-Credentials: browsers send a bearer token only.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowed := slices.Clone(allowedOrigins)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Add("Vary", "Origin")
			origin := r.Header.Get("Origin")
			originAllowed := origin != "" && slices.Contains(allowed, origin)

			if isPreflight(r) {
				h.Add("Vary", "Access-Control-Request-Method")
				h.Add("Vary", "Access-Control-Request-Headers")
				if originAllowed {
					h.Set("Access-Control-Allow-Origin", origin)
					h.Set("Access-Control-Allow-Methods", corsAllowMethods)
					h.Set("Access-Control-Allow-Headers", corsAllowHeaders)
					h.Set("Access-Control-Max-Age", corsMaxAgeSeconds)
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}

			if originAllowed {
				h.Set("Access-Control-Allow-Origin", origin)
				h.Set("Access-Control-Expose-Headers", corsExposeHeaders)
			}
			next.ServeHTTP(w, r)
		})
	}
}

func isPreflight(r *http.Request) bool {
	return r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != ""
}
