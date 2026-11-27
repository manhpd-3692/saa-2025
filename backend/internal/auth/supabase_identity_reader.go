package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Identity lookup outcomes used by provisioning (gap log C08).
var (
	ErrNoGoogleIdentity          = errors.New("no Google identity for this user")
	ErrIdentityLookupUnavailable = errors.New("identity lookup is not configured")
)

// GoogleIdentity is the caller's Google identity as Supabase Auth stored it
// from Google (auth.identities.identity_data). Unlike user_metadata it cannot
// be changed by the client with auth.updateUser.
type GoogleIdentity struct {
	Email         string
	EmailVerified bool
	Name          string
	AvatarURL     string
}

// IdentityReader loads the Google identity of an auth user.
type IdentityReader interface {
	GoogleIdentity(ctx context.Context, userID uuid.UUID) (GoogleIdentity, error)
}

const identityLookupTimeout = 5 * time.Second

// SupabaseIdentityReader reads auth.identities through the Supabase Auth admin
// API with the service key (Go env only, R21); the saa_api role has no access
// to the auth schema.
type SupabaseIdentityReader struct {
	baseURL    string // ${SUPABASE_URL}/auth/v1
	serviceKey string
	client     *http.Client
}

// NewSupabaseIdentityReader refuses to start without the service key.
func NewSupabaseIdentityReader(supabaseURL, serviceKey string) (*SupabaseIdentityReader, error) {
	supabaseURL = strings.TrimRight(strings.TrimSpace(supabaseURL), "/")
	serviceKey = strings.TrimSpace(serviceKey)
	if supabaseURL == "" || serviceKey == "" {
		return nil, errors.New("auth: SUPABASE_URL and SUPABASE_SERVICE_KEY are required to verify identities on provision")
	}
	return &SupabaseIdentityReader{
		baseURL: supabaseURL + "/auth/v1", serviceKey: serviceKey,
		client: &http.Client{Timeout: identityLookupTimeout},
	}, nil
}

// GoogleIdentity returns the user's `google` identity, or ErrNoGoogleIdentity
// when the auth user or its Google identity does not exist.
func (r *SupabaseIdentityReader) GoogleIdentity(ctx context.Context, userID uuid.UUID) (GoogleIdentity, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, r.baseURL+"/admin/users/"+url.PathEscape(userID.String()), nil)
	if err != nil {
		return GoogleIdentity{}, fmt.Errorf("build identity request: %w", err)
	}
	req.Header.Set("apikey", r.serviceKey)
	req.Header.Set("Authorization", "Bearer "+r.serviceKey)
	resp, err := r.client.Do(req)
	if err != nil {
		return GoogleIdentity{}, fmt.Errorf("identity lookup: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return GoogleIdentity{}, ErrNoGoogleIdentity
	}
	if resp.StatusCode != http.StatusOK {
		raw, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return GoogleIdentity{}, fmt.Errorf("identity lookup answered %d: %s", resp.StatusCode, strings.TrimSpace(string(raw)))
	}
	var user struct {
		Identities []struct {
			Provider     string         `json:"provider"`
			IdentityData map[string]any `json:"identity_data"`
		} `json:"identities"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return GoogleIdentity{}, fmt.Errorf("decode identity lookup: %w", err)
	}
	for _, identity := range user.Identities {
		if identity.Provider == requiredProvider {
			return googleIdentityFrom(identity.IdentityData), nil
		}
	}
	return GoogleIdentity{}, ErrNoGoogleIdentity
}

// googleIdentityFrom reads Google's claims; only a JSON `true` counts as verified.
func googleIdentityFrom(data map[string]any) GoogleIdentity {
	text := func(keys ...string) string {
		for _, key := range keys {
			if v, ok := data[key].(string); ok && strings.TrimSpace(v) != "" {
				return strings.TrimSpace(v)
			}
		}
		return ""
	}
	verified, _ := data["email_verified"].(bool)
	return GoogleIdentity{
		Email:         strings.ToLower(text("email")),
		EmailVerified: verified,
		Name:          text("full_name", "name"),
		AvatarURL:     text("avatar_url", "picture"),
	}
}

// UnavailableIdentityReader fails every lookup when the service key is missing:
// the API boots, provisioning fails closed.
type UnavailableIdentityReader struct{}

// GoogleIdentity always reports ErrIdentityLookupUnavailable.
func (UnavailableIdentityReader) GoogleIdentity(context.Context, uuid.UUID) (GoogleIdentity, error) {
	return GoogleIdentity{}, ErrIdentityLookupUnavailable
}
