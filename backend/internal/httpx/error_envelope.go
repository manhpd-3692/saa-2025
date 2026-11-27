package httpx

import "net/http"

// Error codes shared by every capability. Feature packages define their own
// codes (e.g. auth's profile_not_provisioned) and send them through WriteError.
const (
	CodeUnauthorized = "unauthorized"
	CodeForbidden    = "forbidden"
	CodeInternal     = "internal_error"
)

// ErrorEnvelope is the body of every non-2xx JSON response:
// { "error": { "code": "...", "message": "..." } }. `code` is a stable,
// machine-readable key the frontend switches on; `message` is for humans.
type ErrorEnvelope struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail is the inner object of ErrorEnvelope.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// WriteError writes the error envelope with the given status.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, ErrorEnvelope{Error: ErrorDetail{Code: code, Message: message}})
}

// WriteUnauthorized answers 401 for a missing or invalid bearer token.
func WriteUnauthorized(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", `Bearer realm="saa-api"`)
	WriteError(w, http.StatusUnauthorized, CodeUnauthorized, "A valid bearer token is required.")
}

// WriteInternalError answers 500 without leaking the cause (log it first).
func WriteInternalError(w http.ResponseWriter) {
	WriteError(w, http.StatusInternalServerError, CodeInternal, "Internal server error.")
}
