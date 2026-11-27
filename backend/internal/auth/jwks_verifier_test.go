package auth_test

import (
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

func newTestVerifier(t *testing.T) (*auth.JWTVerifier, *testkit.TestJWKSIssuer) {
	t.Helper()
	issuer := testkit.NewTestJWKSIssuer(t)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	verifier, err := auth.NewJWKSVerifier(ctx, issuer.JWKSURL(), issuer.Issuer())
	if err != nil {
		t.Fatalf("NewJWKSVerifier: %v", err)
	}
	return verifier, issuer
}

func TestJWTVerifierAcceptsValidSupabaseToken(t *testing.T) {
	verifier, issuer := newTestVerifier(t)
	userID := uuid.New()
	token := issuer.Sign(t, issuer.ValidClaims(userID, "An.Nguyen@Sun-Asterisk.com"))

	identity, err := verifier.Verify(context.Background(), token)
	if err != nil {
		t.Fatalf("Verify valid token: %v", err)
	}
	if identity.UserID != userID {
		t.Errorf("UserID = %s, want %s", identity.UserID, userID)
	}
	if identity.Email != "an.nguyen@sun-asterisk.com" {
		t.Errorf("Email = %q, want lower-cased claim", identity.Email)
	}
	if identity.Provider != "google" || len(identity.Providers) != 1 || identity.Providers[0] != "google" {
		t.Errorf("Provider/Providers = %q/%v, want google/[google]", identity.Provider, identity.Providers)
	}
	if identity.Name != "Test Sunner" || identity.AvatarURL == "" {
		t.Errorf("Name/AvatarURL = %q/%q, want metadata values", identity.Name, identity.AvatarURL)
	}
}

// F002 SC-008: every malformed or untrusted token is rejected (→ 401 at the middleware).
func TestJWTVerifierRejectsSC008TokenMatrix(t *testing.T) {
	verifier, issuer := newTestVerifier(t)
	userID := uuid.New()
	email := "an.nguyen@sun-asterisk.com"
	claims := func(mutate func(jwt.MapClaims)) jwt.MapClaims {
		c := issuer.ValidClaims(userID, email)
		mutate(c)
		return c
	}
	foreignEC, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	foreignRSA, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	unsignedNone, err := jwt.NewWithClaims(jwt.SigningMethodNone, issuer.ValidClaims(userID, email)).
		SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}
	valid := issuer.Sign(t, issuer.ValidClaims(userID, email))
	noop := func(jwt.MapClaims) {}

	cases := map[string]string{
		"forged signature (foreign key, published kid)": testkit.SignToken(t, jwt.SigningMethodES256, foreignEC, issuer.KeyID, claims(noop)),
		"tampered payload": valid[:len(valid)-4] + "AAAA",
		"expired": issuer.Sign(t, claims(func(c jwt.MapClaims) {
			c["exp"] = time.Now().Add(-time.Minute).Unix()
		})),
		"not yet valid (nbf in the future)": issuer.Sign(t, claims(func(c jwt.MapClaims) {
			c["nbf"] = time.Now().Add(10 * time.Minute).Unix()
		})),
		"missing exp": issuer.Sign(t, claims(func(c jwt.MapClaims) { delete(c, "exp") })),
		"wrong issuer": issuer.Sign(t, claims(func(c jwt.MapClaims) {
			c["iss"] = "https://evil.example/auth/v1"
		})),
		"wrong audience":           issuer.Sign(t, claims(func(c jwt.MapClaims) { c["aud"] = "anon" })),
		"HS256 shared secret":      testkit.SignToken(t, jwt.SigningMethodHS256, []byte("super-secret-jwt-token-with-at-least-32-characters"), issuer.KeyID, claims(noop)),
		"alg none":                 unsignedNone,
		"ES384 not allowed":        testkit.SignToken(t, jwt.SigningMethodES384, mustP384(t), issuer.KeyID, claims(noop)),
		"RS256 unknown kid":        testkit.SignToken(t, jwt.SigningMethodRS256, foreignRSA, "unknown-kid", claims(noop)),
		"published key but no kid": issuer.SignWithKID(t, "", claims(noop)),
		"foreign key and no kid":   testkit.SignToken(t, jwt.SigningMethodES256, foreignEC, "", claims(noop)),
		"subject not a uuid":       issuer.Sign(t, claims(func(c jwt.MapClaims) { c["sub"] = "not-a-uuid" })),
		"missing email":            issuer.Sign(t, claims(func(c jwt.MapClaims) { delete(c, "email") })),
		"garbage":                  "not.a.jwt",
		"empty":                    "",
	}
	for name, token := range cases {
		t.Run(name, func(t *testing.T) {
			_, err := verifier.Verify(context.Background(), token)
			if !errors.Is(err, auth.ErrInvalidToken) {
				t.Fatalf("Verify() error = %v, want ErrInvalidToken", err)
			}
		})
	}
}

func mustP384(t *testing.T) *ecdsa.PrivateKey {
	t.Helper()
	key, err := ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	return key
}
