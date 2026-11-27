//go:build integration

package testkit

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

// SunnerSpec describes a test Sunner: an auth user, optionally its Google
// identity (what provisioning checks, gap log C08) and its users row.
type SunnerSpec struct {
	Email string // UniqueEmail(...) unless the test needs a specific one
	Name  string
	Admin bool // users.role = admin
	// NoProfile skips the users row (a provision test creates it).
	NoProfile bool
	// Identity controls the auth.identities row; nil means a verified Google identity.
	Identity *IdentitySpec
}

// IdentitySpec is the auth.identities row of a Sunner.
type IdentitySpec struct {
	Provider      string // "google" when empty
	EmailVerified bool
	Omit          bool // no identity row at all
}

// UniqueEmail is a company address no other test uses.
func UniqueEmail(label string) string {
	return label + "." + uuid.NewString()[:8] + "@sun-asterisk.com"
}

// CreateSunner inserts the Sunner through the owner connection and removes it
// and every business row that references it when the test ends. Tests never
// truncate shared tables, so suites of different packages can run at once.
func (d *TestDatabase) CreateSunner(t testing.TB, spec SunnerSpec) uuid.UUID {
	t.Helper()
	id := uuid.New()
	if spec.Email == "" {
		spec.Email = UniqueEmail("sunner")
	}
	if spec.Name == "" {
		spec.Name = "Test Sunner " + id.String()[:4]
	}
	ctx := context.Background()
	_, err := d.Owner.Exec(ctx, `
		insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
			confirmation_token, recovery_token, email_change_token_new, email_change,
			raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
		values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, '', now(),
			'', '', '', '', '{"provider":"google","providers":["google"]}',
			jsonb_build_object('email_verified', true, 'full_name', $3::text), now(), now())`,
		id, spec.Email, spec.Name)
	if err != nil {
		t.Fatalf("testkit: create auth user: %v", err)
	}
	t.Cleanup(func() { d.deleteSunner(t, id) })

	identity := IdentitySpec{Provider: "google", EmailVerified: true}
	if spec.Identity != nil {
		identity = *spec.Identity
	}
	if !identity.Omit {
		if identity.Provider == "" {
			identity.Provider = "google"
		}
		_, err = d.Owner.Exec(ctx, `
			insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
			values ($1::text, $2::uuid, jsonb_build_object('sub', $1::text, 'email', $3::text, 'email_verified', $4::boolean,
				'full_name', $5::text, 'avatar_url', 'https://example.test/' || $1::text || '.png'), $6::text, now(), now())`,
			id.String(), id, spec.Email, identity.EmailVerified, spec.Name, identity.Provider)
		if err != nil {
			t.Fatalf("testkit: create identity: %v", err)
		}
	}
	if !spec.NoProfile {
		role := "user"
		if spec.Admin {
			role = "admin"
		}
		if _, err := d.Owner.Exec(ctx, `insert into public.users (id, email, name, role) values ($1, $2, $3, $4::user_role)`,
			id, spec.Email, spec.Name, role); err != nil {
			t.Fatalf("testkit: create profile: %v", err)
		}
	}
	return id
}

// deleteSunner removes the Sunner's business rows children-first, then the
// auth user (which cascades public.users and auth.identities).
func (d *TestDatabase) deleteSunner(t testing.TB, id uuid.UUID) {
	t.Helper()
	const kudosOf = `(select k.id from public.kudos k where k.sender_id = $1 or k.receiver_id = $1)`
	statements := []string{
		`delete from public.notifications where recipient_id = $1 or kudo_id in ` + kudosOf,
		`delete from public.hearts where user_id = $1 or kudo_id in ` + kudosOf,
		`delete from public.kudo_images where kudo_id in ` + kudosOf +
			` or upload_id in (select u.id from public.kudo_uploads u where u.owner_id = $1)`,
		`delete from public.kudo_uploads where owner_id = $1 or kudo_id in ` + kudosOf,
		`delete from public.secret_boxes where user_id = $1`,
		`delete from public.campaigns where created_by = $1`,
		`delete from public.kudos where sender_id = $1 or receiver_id = $1`,
		`delete from auth.users where id = $1`,
	}
	ctx := context.Background()
	tx, err := d.Owner.Begin(ctx)
	if err != nil {
		t.Errorf("testkit: delete sunner %s: %v", id, err)
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()
	for _, stmt := range statements {
		if _, err := tx.Exec(ctx, stmt, id); err != nil {
			t.Errorf("testkit: delete sunner %s: %v", id, err)
			return
		}
	}
	if err := tx.Commit(ctx); err != nil {
		t.Errorf("testkit: delete sunner %s: %v", id, err)
	}
}

// KudoSpec is a kudo inserted directly (tests of readers, hearts and moderation).
type KudoSpec struct {
	Sender, Receiver uuid.UUID
	Anonymous        bool
	Spam             bool
}

// CreateKudo inserts a kudo; it is removed with its sender or receiver.
func (d *TestDatabase) CreateKudo(t testing.TB, spec KudoSpec) uuid.UUID {
	t.Helper()
	status := "public"
	if spec.Spam {
		status = "spam"
	}
	var id uuid.UUID
	err := d.Owner.QueryRow(context.Background(), `
		insert into public.kudos (sender_id, receiver_id, title, content, is_anonymous, status)
		values ($1, $2, 'Test kudo', '<p>Thank you</p>', $3, $4::kudo_status) returning id`,
		spec.Sender, spec.Receiver, spec.Anonymous, status).Scan(&id)
	if err != nil {
		t.Fatalf("testkit: create kudo: %v", err)
	}
	return id
}
