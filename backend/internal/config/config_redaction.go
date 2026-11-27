package config

import (
	"fmt"
	"log/slog"
	"net/url"
)

const redacted = "[redacted]"

// LogValue implements slog.LogValuer so logging the whole Config can never leak
// the DATABASE_URL password or the Supabase service key.
func (c Config) LogValue() slog.Value {
	serviceKey := ""
	if c.SupabaseServiceKey != "" {
		serviceKey = redacted
	}
	return slog.GroupValue(
		slog.String("api_addr", c.APIAddr),
		slog.String("database_url", redactDatabaseURL(c.DatabaseURL)),
		slog.String("supabase_url", c.SupabaseURL),
		slog.String("jwt_issuer", c.JWTIssuer),
		slog.String("jwks_url", c.JWKSURL),
		slog.Any("frontend_origins", c.FrontendOrigins),
		slog.Int("admin_emails", len(c.AdminEmails)),
		slog.String("supabase_service_key", serviceKey),
	)
}

// String keeps fmt verbs (%v, %+v, %s) as safe as slog.
func (c Config) String() string { return fmt.Sprint(c.LogValue()) }

// redactDatabaseURL masks the password; an unparsable value is hidden entirely
// because it may still contain one.
func redactDatabaseURL(raw string) string {
	if raw == "" {
		return ""
	}
	u, err := url.Parse(raw)
	if err != nil {
		return redacted
	}
	return u.Redacted()
}
