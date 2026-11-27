// Package config loads the Go API configuration from environment variables
// (F002 § 4.6). Secrets (DATABASE_URL, SUPABASE_SERVICE_KEY) live only here,
// never in the Next.js app (Codex R21).
package config

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// Environment variable names read by Load.
const (
	EnvAPIAddr            = "API_ADDR"
	EnvDatabaseURL        = "DATABASE_URL"
	EnvSupabaseURL        = "SUPABASE_URL"
	EnvSupabaseJWKSURL    = "SUPABASE_JWKS_URL"
	EnvFrontendOrigins    = "FRONTEND_ORIGINS"
	EnvAdminEmails        = "ADMIN_EMAILS"
	EnvSupabaseServiceKey = "SUPABASE_SERVICE_KEY"
)

const defaultAPIAddr = ":8080"

// Config is the validated runtime configuration of the Go API.
type Config struct {
	// APIAddr is the listen address of the HTTP server (default ":8080").
	APIAddr string
	// DatabaseURL connects as the dedicated Postgres role saa_api.
	DatabaseURL string
	// SupabaseURL is the project API URL without a trailing slash.
	SupabaseURL string
	// JWTIssuer is the only accepted `iss`: ${SUPABASE_URL}/auth/v1 (Codex R21).
	JWTIssuer string
	// JWKSURL is SUPABASE_JWKS_URL, or ${SUPABASE_URL}/auth/v1/.well-known/jwks.json.
	JWKSURL string
	// FrontendOrigins are the exact browser origins allowed by CORS (Codex R06).
	FrontendOrigins []string
	// AdminEmails are lower-cased emails that get role admin on provision (G02, AD15).
	AdminEmails []string
	// SupabaseServiceKey is the Storage service key (F005 uploads); Go env only. Optional at
	// boot (unused until the upload phase, which must require it); validated when set.
	SupabaseServiceKey string
}

// Load reads and validates the configuration. getenv is os.Getenv in production;
// tests pass a map lookup. Every problem is reported at once.
func Load(getenv func(string) string) (Config, error) {
	var errs []error
	required := func(name string) string {
		v := strings.TrimSpace(getenv(name))
		if v == "" {
			errs = append(errs, fmt.Errorf("%s is required", name))
		}
		return v
	}

	cfg := Config{
		APIAddr:            strings.TrimSpace(getenv(EnvAPIAddr)),
		DatabaseURL:        required(EnvDatabaseURL),
		SupabaseServiceKey: strings.TrimSpace(getenv(EnvSupabaseServiceKey)),
		AdminEmails:        parseAdminEmails(getenv(EnvAdminEmails)),
	}
	if cfg.APIAddr == "" {
		cfg.APIAddr = defaultAPIAddr
	}

	if raw := required(EnvSupabaseURL); raw != "" {
		base, err := parseSecureURL(raw)
		if err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", EnvSupabaseURL, err))
		} else {
			cfg.SupabaseURL = strings.TrimRight(base.String(), "/")
			cfg.JWTIssuer = cfg.SupabaseURL + "/auth/v1"
			cfg.JWKSURL = cfg.JWTIssuer + "/.well-known/jwks.json"
		}
	}
	if raw := strings.TrimSpace(getenv(EnvSupabaseJWKSURL)); raw != "" {
		if u, err := parseSecureURL(raw); err != nil {
			errs = append(errs, fmt.Errorf("%s: %w", EnvSupabaseJWKSURL, err))
		} else {
			cfg.JWKSURL = u.String()
		}
	}

	if err := checkServiceKey(cfg.SupabaseServiceKey); err != nil {
		errs = append(errs, err)
	}

	origins, err := parseOrigins(required(EnvFrontendOrigins))
	if err != nil {
		errs = append(errs, fmt.Errorf("%s: %w", EnvFrontendOrigins, err))
	}
	cfg.FrontendOrigins = origins

	if len(errs) > 0 {
		return Config{}, fmt.Errorf("invalid configuration: %w", errors.Join(errs...))
	}
	return cfg, nil
}

func parseHTTPURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, err
	}
	if (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
		return nil, fmt.Errorf("%q must be an absolute http(s) URL", raw)
	}
	return u, nil
}

// parseOrigins splits a comma list into exact origins (scheme://host[:port]).
func parseOrigins(raw string) ([]string, error) {
	var origins []string
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		u, err := parseHTTPURL(part)
		if err != nil {
			return nil, err
		}
		if (u.Path != "" && u.Path != "/") || u.RawQuery != "" || u.Fragment != "" || u.User != nil {
			return nil, fmt.Errorf("%q must be a bare origin like http://localhost:3000", part)
		}
		origins = append(origins, u.Scheme+"://"+u.Host)
	}
	if raw != "" && len(origins) == 0 {
		return nil, errors.New("no origin listed")
	}
	return origins, nil
}

func parseAdminEmails(raw string) []string {
	var emails []string
	for _, part := range strings.Split(raw, ",") {
		if email := strings.ToLower(strings.TrimSpace(part)); email != "" {
			emails = append(emails, email)
		}
	}
	return emails
}
