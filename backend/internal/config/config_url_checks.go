package config

import (
	"fmt"
	"net/url"
	"strings"
	"unicode"

	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
)

// parseSecureURL accepts an absolute https URL, or http only for a loopback
// host. SUPABASE_URL and SUPABASE_JWKS_URL decide whose tokens are trusted, so
// a remote plain-http value would let a network attacker mint any identity.
func parseSecureURL(raw string) (*url.URL, error) {
	u, err := parseHTTPURL(raw)
	if err != nil {
		return nil, err
	}
	if u.Scheme != "https" && !dbx.IsLoopbackHost(u.Hostname()) {
		return nil, fmt.Errorf("%q must use https unless the host is loopback (127.0.0.1, ::1, localhost)", raw)
	}
	return u, nil
}

// checkServiceKey rejects a key a header or URL could not carry intact.
func checkServiceKey(key string) error {
	if strings.IndexFunc(key, func(r rune) bool { return unicode.IsSpace(r) || unicode.IsControl(r) }) >= 0 {
		return fmt.Errorf("%s must not contain whitespace or control characters", EnvSupabaseServiceKey)
	}
	return nil
}
