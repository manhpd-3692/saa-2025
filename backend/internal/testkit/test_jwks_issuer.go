// Package testkit holds test-only infrastructure shared by Go tests: an
// in-process ES256 JWKS issuer that mimics Supabase Auth, and (integration
// builds only) database helpers. Never imported by production code.
package testkit

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TestJWKSIssuer serves a Supabase-shaped JWKS at
// {SupabaseURL}/auth/v1/.well-known/jwks.json and signs ES256 tokens whose
// issuer is {SupabaseURL}/auth/v1, so the production verifier can be pointed at
// it exactly as it is pointed at local Supabase.
type TestJWKSIssuer struct {
	// SupabaseURL is the base URL of the in-process server (no trailing slash).
	SupabaseURL string
	// KeyID is the `kid` of the published signing key.
	KeyID string
	key   *ecdsa.PrivateKey
}

// NewTestJWKSIssuer starts the JWKS server; it is closed when the test ends.
func NewTestJWKSIssuer(t testing.TB) *TestJWKSIssuer {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatalf("testkit: generate ES256 key: %v", err)
	}
	issuer := &TestJWKSIssuer{KeyID: uuid.NewString(), key: key}

	jwks, err := json.Marshal(map[string]any{"keys": []any{publicJWK(&key.PublicKey, issuer.KeyID)}})
	if err != nil {
		t.Fatalf("testkit: encode JWKS: %v", err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /auth/v1/.well-known/jwks.json", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write(jwks)
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	issuer.SupabaseURL = server.URL
	return issuer
}

// Issuer is the expected `iss` claim: {SupabaseURL}/auth/v1.
func (i *TestJWKSIssuer) Issuer() string { return i.SupabaseURL + "/auth/v1" }

// JWKSURL is where the verifier fetches the public keys.
func (i *TestJWKSIssuer) JWKSURL() string { return i.Issuer() + "/.well-known/jwks.json" }

// ValidClaims returns the claims of a fresh Supabase access token for a
// verified Google identity, valid for one hour. Tests mutate the map to build
// failure cases.
func (i *TestJWKSIssuer) ValidClaims(userID uuid.UUID, email string) jwt.MapClaims {
	now := time.Now()
	return jwt.MapClaims{
		"iss":   i.Issuer(),
		"aud":   "authenticated",
		"sub":   userID.String(),
		"email": email,
		"role":  "authenticated",
		"iat":   now.Unix(),
		"exp":   now.Add(time.Hour).Unix(),
		"app_metadata": map[string]any{
			"provider":  "google",
			"providers": []string{"google"},
		},
		"user_metadata": map[string]any{
			"email_verified": true,
			"full_name":      "Test Sunner",
			"avatar_url":     "https://example.test/avatar.png",
		},
	}
}

// Sign signs claims with the published ES256 key and its kid.
func (i *TestJWKSIssuer) Sign(t testing.TB, claims jwt.Claims) string {
	t.Helper()
	return i.SignWithKID(t, i.KeyID, claims)
}

// SignWithKID signs with the published key but an arbitrary `kid` header (empty
// omits it), to prove a legitimately signed token is still rejected without a
// matching kid.
func (i *TestJWKSIssuer) SignWithKID(t testing.TB, kid string, claims jwt.Claims) string {
	t.Helper()
	return SignToken(t, jwt.SigningMethodES256, i.key, kid, claims)
}

// SignToken signs claims with any method and key, setting `kid` when non-empty.
// Used to build forged tokens (foreign key, HS256) for rejection tests.
func SignToken(t testing.TB, method jwt.SigningMethod, key any, kid string, claims jwt.Claims) string {
	t.Helper()
	token := jwt.NewWithClaims(method, claims)
	if kid != "" {
		token.Header["kid"] = kid
	}
	signed, err := token.SignedString(key)
	if err != nil {
		t.Fatalf("testkit: sign token: %v", err)
	}
	return signed
}

func publicJWK(pub *ecdsa.PublicKey, kid string) map[string]any {
	coord := func(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }
	ecdhKey, err := pub.ECDH()
	if err != nil {
		panic("testkit: convert P-256 public key: " + err.Error())
	}
	raw := ecdhKey.Bytes() // uncompressed: 0x04 || X || Y, 32 bytes each for P-256
	return map[string]any{
		"kty": "EC",
		"crv": "P-256",
		"alg": "ES256",
		"use": "sig",
		"kid": kid,
		"x":   coord(raw[1:33]),
		"y":   coord(raw[33:65]),
	}
}
