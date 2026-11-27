package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/time/rate"
)

// ErrInvalidToken is returned for every token that fails verification; the
// middleware maps it to 401 without telling the caller why.
var ErrInvalidToken = errors.New("invalid access token")

// Token acceptance policy (F002 A0 step 2, Codex R21).
const (
	expectedAudience = "authenticated"
	jwksFetchTimeout = 5 * time.Second
	// An unknown `kid` triggers at most one JWKS refetch per minute; callers
	// never wait for the limiter, they fail fast with 401 instead.
	unknownKIDRefreshEvery = time.Minute
)

// allowedAlgorithms are the only accepted JWS algorithms: asymmetric keys
// published at the Supabase JWKS. No HS256 shared secret, no `none`.
var allowedAlgorithms = []string{jwt.SigningMethodES256.Alg(), jwt.SigningMethodRS256.Alg()}

// KeySource resolves the verification key for a token (keyfunc.Keyfunc).
type KeySource interface {
	KeyfuncCtx(ctx context.Context) jwt.Keyfunc
}

// JWTVerifier verifies Supabase access tokens against the project JWKS.
type JWTVerifier struct {
	keys   KeySource
	parser *jwt.Parser
}

// NewJWKSVerifier fetches and caches the JWKS at jwksURL (refreshed hourly and
// on an unknown kid) until ctx ends. A JWKS that is unreachable at startup is
// logged and retried, so the API can boot before Supabase.
func NewJWKSVerifier(ctx context.Context, jwksURL, issuer string) (*JWTVerifier, error) {
	keys, err := keyfunc.NewDefaultOverrideCtx(ctx, []string{jwksURL}, keyfunc.Override{
		HTTPTimeout:       jwksFetchTimeout,
		RateLimitWaitMax:  time.Millisecond,
		RefreshUnknownKID: rate.NewLimiter(rate.Every(unknownKIDRefreshEvery), 1),
		RefreshErrorHandlerFunc: func(url string) func(context.Context, error) {
			return func(ctx context.Context, err error) {
				slog.ErrorContext(ctx, "refresh Supabase JWKS", "url", url, "error", err)
			}
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create JWKS key source: %w", err)
	}
	return NewJWTVerifier(keys, issuer), nil
}

// NewJWTVerifier builds a verifier over any key source; issuer is
// ${SUPABASE_URL}/auth/v1.
func NewJWTVerifier(keys KeySource, issuer string) *JWTVerifier {
	return &JWTVerifier{
		keys: keys,
		parser: jwt.NewParser(
			jwt.WithValidMethods(allowedAlgorithms),
			jwt.WithIssuer(issuer),
			jwt.WithAudience(expectedAudience),
			jwt.WithExpirationRequired(), // exp required; nbf enforced when present
		),
	}
}

// supabaseClaims is the subset of a Supabase access token the API reads.
type supabaseClaims struct {
	jwt.RegisteredClaims
	Email       string `json:"email"`
	AppMetadata struct {
		Provider  string   `json:"provider"`
		Providers []string `json:"providers"`
	} `json:"app_metadata"`
	UserMetadata struct {
		FullName  string `json:"full_name"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
		Picture   string `json:"picture"`
	} `json:"user_metadata"`
}

// Verify checks signature, algorithm, issuer, audience, exp and nbf, then
// extracts the identity. Every failure wraps ErrInvalidToken.
func (v *JWTVerifier) Verify(ctx context.Context, raw string) (VerifiedIdentity, error) {
	claims := &supabaseClaims{}
	token, err := v.parser.ParseWithClaims(raw, claims, requireKID(v.keys.KeyfuncCtx(ctx)))
	if err != nil {
		return VerifiedIdentity{}, fmt.Errorf("%w: %w", ErrInvalidToken, err)
	}
	if !token.Valid {
		return VerifiedIdentity{}, ErrInvalidToken
	}
	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		return VerifiedIdentity{}, fmt.Errorf("%w: subject is not a uuid", ErrInvalidToken)
	}
	email := strings.ToLower(strings.TrimSpace(claims.Email))
	if email == "" {
		return VerifiedIdentity{}, fmt.Errorf("%w: email claim missing", ErrInvalidToken)
	}
	meta := claims.UserMetadata
	return VerifiedIdentity{
		UserID:    userID,
		Email:     email,
		Provider:  claims.AppMetadata.Provider,
		Providers: claims.AppMetadata.Providers,
		Name:      firstNonEmpty(meta.FullName, meta.Name),
		AvatarURL: firstNonEmpty(meta.AvatarURL, meta.Picture),
	}, nil
}

// requireKID rejects a token without a `kid` header. keyfunc would otherwise
// fall back to trying every published key, so any key in the set would verify
// a token that names none; Supabase always sets `kid`, so we insist on it.
func requireKID(next jwt.Keyfunc) jwt.Keyfunc {
	return func(token *jwt.Token) (any, error) {
		if kid, _ := token.Header["kid"].(string); kid == "" {
			return nil, errors.New("token header has no kid")
		}
		return next(token)
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if v = strings.TrimSpace(v); v != "" {
			return v
		}
	}
	return ""
}
