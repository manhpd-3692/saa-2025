//go:build integration

package main

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// Reviewer W3: a users row already owns the email under another id (an auth
// user re-created with a new `sub`). Provision answers 409 profile_conflict,
// logs the user id with an email hash (never the address), and writes nothing.
func TestProvisionEmailOwnedByAnotherProfileAnswers409(t *testing.T) {
	h := newAPIHarness(t)
	ctx := context.Background()
	email := testkit.UniqueEmail("w3.conflict")
	holder := h.db.CreateSunner(t, testkit.SunnerSpec{Email: email})
	// The old auth user moves to another address; its users row keeps the email.
	if _, err := h.db.Owner.Exec(ctx, `update auth.users set email = $2 where id = $1`,
		holder, testkit.UniqueEmail("w3.moved")); err != nil {
		t.Fatal(err)
	}
	newcomer, token := h.sunner(testkit.SunnerSpec{Email: email, NoProfile: true})

	var logs bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(previous) })

	got := h.do(http.MethodPost, "/api/v1/me/provision", token, nil)
	if got.Status != http.StatusConflict || got.errorCode(t) != "profile_conflict" {
		t.Fatalf("provision with a taken email = %d %s, want 409 profile_conflict", got.Status, got.Body)
	}
	var rows int
	var holderEmail string
	if err := h.db.Owner.QueryRow(ctx, `select (select count(*) from public.users where id = $1),
		(select email from public.users where id = $2)`, newcomer, holder).Scan(&rows, &holderEmail); err != nil {
		t.Fatal(err)
	}
	if rows != 0 || holderEmail != email {
		t.Fatalf("conflict wrote %d rows for the newcomer; holder email %q, want unchanged %q", rows, holderEmail, email)
	}
	logged := logs.String()
	if !strings.Contains(logged, `"level":"ERROR"`) || !strings.Contains(logged, newcomer.String()) ||
		!strings.Contains(logged, "email_sha256") || strings.Contains(logged, email) {
		t.Fatalf("conflict log = %s; want an error with user_id and email_sha256, without the address", logged)
	}
}
