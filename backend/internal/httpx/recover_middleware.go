package httpx

import (
	"log/slog"
	"net/http"
	"runtime/debug"
)

// Recover turns a handler panic into a logged 500 error envelope. Without it
// net/http drops the connection, so the browser sees a CORS/network failure
// instead of a response. Mount it inside CORS (so the 500 still carries CORS
// headers) and outside the route classes.
//
// http.ErrAbortHandler is re-panicked: it is the stdlib's intentional way to
// abort a response and must keep that meaning.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			rec := recover()
			if rec == nil {
				return
			}
			if rec == http.ErrAbortHandler {
				panic(rec)
			}
			slog.ErrorContext(r.Context(), "handler panic",
				"panic", rec, "method", r.Method, "path", r.URL.Path, "stack", string(debug.Stack()))
			WriteInternalError(w)
		}()
		next.ServeHTTP(w, r)
	})
}
