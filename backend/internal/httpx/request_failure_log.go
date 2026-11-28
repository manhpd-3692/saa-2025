package httpx

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
)

// CanceledByCaller reports whether err comes from the caller hanging up: the
// request context itself ended (tab closed, navigation, the browser's 5 s
// budget) and the failure is that cancellation. Our own deadline (the 5 s
// database context, R23) expiring while the caller still waits is not.
func CanceledByCaller(r *http.Request, err error) bool {
	return r.Context().Err() != nil && (errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded))
}

// LogRequestFailure logs a failed request at ERROR, or at INFO when the
// failure is only the caller hanging up (CanceledByCaller): that is not a
// server fault and must not page anyone, while a database outage still does.
// `args` are slog key/value pairs; the error is appended as "error".
func LogRequestFailure(r *http.Request, err error, msg string, args ...any) {
	level := slog.LevelError
	if CanceledByCaller(r, err) {
		level = slog.LevelInfo
		msg += " (cancelled by the caller)"
	}
	slog.Log(r.Context(), level, msg, append(args, "error", err)...)
}
