//go:build integration

package auth_test

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"slices"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
)

func localSupabaseURL(t *testing.T) string {
	t.Helper()
	url := strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/")
	if url == "" {
		t.Fatal("SUPABASE_URL is required for -tags integration (see backend/README.md)")
	}
	return url
}

// F002 SC-010 (Codex R21): the local JWKS publishes only asymmetric ES256/RS256
// public keys — no shared HS256 secret and no private material.
func TestLocalSupabaseJWKSServesOnlyAsymmetricKeys(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet,
		localSupabaseURL(t)+"/auth/v1/.well-known/jwks.json", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("fetch JWKS: %v", err)
	}
	defer resp.Body.Close()
	var jwks struct {
		Keys []map[string]any `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("JWKS status %d, decode err %v", resp.StatusCode, err)
	}
	if len(jwks.Keys) == 0 {
		t.Fatal("JWKS has no keys: configure auth.signing_keys_path (backend/README.md)")
	}
	for _, key := range jwks.Keys {
		alg, _ := key["alg"].(string)
		kty, _ := key["kty"].(string)
		_, symmetric := key["k"]
		_, private := key["d"]
		if !slices.Contains([]string{"ES256", "RS256"}, alg) || !slices.Contains([]string{"EC", "RSA"}, kty) || symmetric || private {
			t.Errorf("JWKS key kid=%v alg=%q kty=%q symmetric=%v private=%v, want public ES256/RS256 only",
				key["kid"], alg, kty, symmetric, private)
		}
	}
}

// A token signed by the local Supabase signing key (minted with the CLI) passes
// the production verifier fetching the real local JWKS.
func TestVerifierAcceptsTokenSignedByLocalSupabase(t *testing.T) {
	cli, err := exec.LookPath("supabase")
	if err != nil {
		t.Skip("supabase CLI not on PATH; run the integration suite from WSL (backend/README.md)")
	}
	baseURL := localSupabaseURL(t)
	userID := uuid.New()
	payload, err := json.Marshal(map[string]any{
		"iss":           baseURL + "/auth/v1",
		"aud":           "authenticated",
		"email":         "local.token@sun-asterisk.com",
		"app_metadata":  map[string]any{"provider": "google"},
		"user_metadata": map[string]any{"email_verified": true, "full_name": "Local Token"},
	})
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	repoRoot, err := filepath.Abs(filepath.Join("..", "..", ".."))
	if err != nil {
		t.Fatal(err)
	}
	out, err := exec.CommandContext(ctx, cli, "gen", "bearer-jwt", "--workdir", repoRoot, "--agent", "no",
		"--role", "authenticated", "--sub", userID.String(), "--payload", string(payload)).Output()
	if err != nil {
		t.Fatalf("supabase gen bearer-jwt: %v", err)
	}
	lines := strings.Fields(strings.TrimSpace(string(out)))
	if len(lines) == 0 {
		t.Fatal("supabase gen bearer-jwt printed no token")
	}

	verifier, err := auth.NewJWKSVerifier(ctx, baseURL+"/auth/v1/.well-known/jwks.json", baseURL+"/auth/v1")
	if err != nil {
		t.Fatal(err)
	}
	identity, err := verifier.Verify(ctx, lines[len(lines)-1])
	if err != nil {
		t.Fatalf("Verify(local Supabase token): %v", err)
	}
	if identity.UserID != userID || !identity.IsEligible() {
		t.Fatalf("identity = %+v, want sub %s and an eligible identity", identity, userID)
	}
}
