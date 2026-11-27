// Package httpx holds the transport layer shared by every Go API handler:
// JSON responses, the error envelope, CORS and the route-class wrappers.
package httpx

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

// WriteJSON writes body as JSON with the given status. API responses are
// per-user, so they are never cached. A body that cannot be encoded turns
// into a 500 error envelope instead of a truncated response.
func WriteJSON(w http.ResponseWriter, status int, body any) {
	payload, err := json.Marshal(body)
	if err != nil {
		slog.Error("encode JSON response", "error", err)
		status = http.StatusInternalServerError
		payload = []byte(`{"error":{"code":"internal_error","message":"Internal server error."}}`)
	}
	h := w.Header()
	h.Set("Content-Type", "application/json; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	if _, err := w.Write(append(payload, '\n')); err != nil {
		slog.Debug("write JSON response", "error", err)
	}
}
