package config_test

import (
	"bytes"
	"fmt"
	"log/slog"
	"slices"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/config"
)

func env(values map[string]string) func(string) string {
	return func(key string) string { return values[key] }
}

func validEnv() map[string]string {
	return map[string]string{
		config.EnvDatabaseURL:     "postgres://saa_api:pw@127.0.0.1:54322/postgres",
		config.EnvSupabaseURL:     "http://127.0.0.1:54321/",
		config.EnvFrontendOrigins: " http://localhost:3000 , http://127.0.0.1:3000/ ",
		config.EnvAdminEmails:     " Admin@Sun-Asterisk.com ,, boss@sun-asterisk.com ",
	}
}

func TestLoadDerivesIssuerJWKSAndNormalizesLists(t *testing.T) {
	cfg, err := config.Load(env(validEnv()))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.APIAddr != ":8080" {
		t.Errorf("APIAddr = %q, want default :8080", cfg.APIAddr)
	}
	if cfg.JWTIssuer != "http://127.0.0.1:54321/auth/v1" {
		t.Errorf("JWTIssuer = %q", cfg.JWTIssuer)
	}
	if cfg.JWKSURL != "http://127.0.0.1:54321/auth/v1/.well-known/jwks.json" {
		t.Errorf("JWKSURL = %q", cfg.JWKSURL)
	}
	if want := []string{"http://localhost:3000", "http://127.0.0.1:3000"}; !slices.Equal(cfg.FrontendOrigins, want) {
		t.Errorf("FrontendOrigins = %v, want %v", cfg.FrontendOrigins, want)
	}
	if want := []string{"admin@sun-asterisk.com", "boss@sun-asterisk.com"}; !slices.Equal(cfg.AdminEmails, want) {
		t.Errorf("AdminEmails = %v, want %v", cfg.AdminEmails, want)
	}
}

func TestLoadHonoursJWKSOverride(t *testing.T) {
	values := validEnv()
	values[config.EnvSupabaseJWKSURL] = "https://jwks.internal.example/auth/v1/.well-known/jwks.json"
	cfg, err := config.Load(env(values))
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.JWKSURL != values[config.EnvSupabaseJWKSURL] {
		t.Errorf("JWKSURL = %q, want override", cfg.JWKSURL)
	}
	if cfg.JWTIssuer != "http://127.0.0.1:54321/auth/v1" {
		t.Errorf("issuer must still derive from SUPABASE_URL, got %q", cfg.JWTIssuer)
	}
}

func TestLoadReportsEveryProblem(t *testing.T) {
	values := map[string]string{
		config.EnvSupabaseURL:     "127.0.0.1:54321",
		config.EnvFrontendOrigins: "http://localhost:3000/app",
	}
	_, err := config.Load(env(values))
	if err == nil {
		t.Fatal("Load accepted an invalid configuration")
	}
	for _, want := range []string{
		config.EnvDatabaseURL, config.EnvSupabaseURL, config.EnvFrontendOrigins,
	} {
		if !strings.Contains(err.Error(), want) {
			t.Errorf("error %q does not mention %s", err, want)
		}
	}
}

// W1: the JWKS and issuer URLs decide whose tokens are trusted, so plain http is
// only allowed against a loopback host.
func TestLoadRequiresHTTPSUnlessLoopback(t *testing.T) {
	tests := []struct {
		name, key, value string
		wantErr          bool
	}{
		{"SUPABASE_URL http remote", config.EnvSupabaseURL, "http://supabase.example.com", true},
		{"SUPABASE_URL http look-alike host", config.EnvSupabaseURL, "http://localhost.evil.example", true},
		{"SUPABASE_URL https remote", config.EnvSupabaseURL, "https://abc.supabase.co", false},
		{"SUPABASE_URL http 127.0.0.1", config.EnvSupabaseURL, "http://127.0.0.1:54321", false},
		{"SUPABASE_URL http localhost", config.EnvSupabaseURL, "http://localhost:54321", false},
		{"SUPABASE_URL http IPv6 loopback", config.EnvSupabaseURL, "http://[::1]:54321", false},
		{"JWKS http remote", config.EnvSupabaseJWKSURL, "http://supabase.example.com/jwks.json", true},
		{"JWKS https remote", config.EnvSupabaseJWKSURL, "https://supabase.example.com/jwks.json", false},
		{"JWKS http 127.0.0.1", config.EnvSupabaseJWKSURL, "http://127.0.0.1:54321/jwks.json", false},
		{"JWKS http localhost", config.EnvSupabaseJWKSURL, "http://localhost:54321/jwks.json", false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			values := validEnv()
			values[tc.key] = tc.value
			_, err := config.Load(env(values))
			if gotErr := err != nil; gotErr != tc.wantErr {
				t.Fatalf("Load() error = %v, want error %v", err, tc.wantErr)
			}
			if tc.wantErr && !strings.Contains(err.Error(), tc.key) {
				t.Errorf("error %q does not name %s", err, tc.key)
			}
		})
	}
}

// W5: the service key is not read until the upload phase, so the API boots without it.
func TestLoadServiceKeyIsOptionalButValidatedWhenSet(t *testing.T) {
	values := validEnv()
	delete(values, config.EnvSupabaseServiceKey)
	cfg, err := config.Load(env(values))
	if err != nil {
		t.Fatalf("Load without service key: %v", err)
	}
	if cfg.SupabaseServiceKey != "" {
		t.Errorf("SupabaseServiceKey = %q, want empty", cfg.SupabaseServiceKey)
	}

	values[config.EnvSupabaseServiceKey] = "half a\nkey"
	if _, err := config.Load(env(values)); err == nil || !strings.Contains(err.Error(), config.EnvSupabaseServiceKey) {
		t.Fatalf("Load accepted a service key with whitespace: %v", err)
	}
}

// W5: logging the whole Config must never print the DB password or service key.
func TestConfigLogValueRedactsSecrets(t *testing.T) {
	values := validEnv()
	values[config.EnvDatabaseURL] = "postgres://saa_api:s3cr3t-pw@127.0.0.1:54322/postgres"
	values[config.EnvSupabaseServiceKey] = "sb_secret_abcdef"
	cfg, err := config.Load(env(values))
	if err != nil {
		t.Fatal(err)
	}

	var buf bytes.Buffer
	slog.New(slog.NewJSONHandler(&buf, nil)).Info("loaded", "config", cfg)
	rendered := buf.String() + fmt.Sprintf("%v|%+v|%s", cfg, cfg, cfg)
	for _, secret := range []string{"s3cr3t-pw", "sb_secret_abcdef"} {
		if strings.Contains(rendered, secret) {
			t.Errorf("logged config leaks %q: %s", secret, rendered)
		}
	}
	for _, want := range []string{"saa_api", "127.0.0.1:54322", "http://127.0.0.1:54321/auth/v1"} {
		if !strings.Contains(rendered, want) {
			t.Errorf("logged config lost %q: %s", want, rendered)
		}
	}
}
