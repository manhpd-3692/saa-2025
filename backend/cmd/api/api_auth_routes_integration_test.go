//go:build integration

package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// ensureEvent makes sure a current event exists (the dev seed writes one).
func ensureEvent(t *testing.T, tdb *testkit.TestDatabase) {
	t.Helper()
	var n int
	ctx := context.Background()
	if err := tdb.Owner.QueryRow(ctx, `select count(*) from public.events`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n > 0 {
		return
	}
	var id uuid.UUID
	if err := tdb.Owner.QueryRow(ctx, `insert into public.events (name, start_at, ceremony_at)
		values ('SAA 2025 (test)', now() - interval '1 day', now() + interval '14 days') returning id`).Scan(&id); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = tdb.Owner.Exec(context.Background(), `delete from public.events where id = $1`, id) })
}

// F002 SC-013 + F003 SC-006 (Codex N09) with the real handlers: PUBLIC answers
// without a token, IDENTITY-ONLY provision creates the row, PROFILE answers 403
// profile_not_provisioned before it, ADMIN refuses a user, preflight is 204.
func TestAssembledRouterRouteClassesWithRealHandlers(t *testing.T) {
	h := newAPIHarness(t)
	ensureEvent(t, h.db)
	spam := "/api/v1/admin/kudos/" + uuid.NewString() + "/spam"

	event := h.do(http.MethodGet, "/api/v1/events/current", "", nil)
	body := event.json(t)
	if event.Status != http.StatusOK || body["startAt"] == nil || body["ceremonyAt"] == nil || body["serverNow"] == nil {
		t.Fatalf("events without token = %d %s", event.Status, event.Body)
	}
	for _, r := range []struct{ method, path string }{
		{http.MethodPost, "/api/v1/me/provision"}, {http.MethodGet, "/api/v1/me"}, {http.MethodPost, spam},
	} {
		if got := h.do(r.method, r.path, "", nil); got.Status != http.StatusUnauthorized || got.errorCode(t) != "unauthorized" {
			t.Errorf("%s %s without token = %d %s", r.method, r.path, got.Status, got.Body)
		}
	}

	orphan, token := h.sunner(testkit.SunnerSpec{NoProfile: true})
	if got := h.do(http.MethodGet, "/api/v1/events/current", token, nil); got.Status != http.StatusOK {
		t.Errorf("events with an orphan token = %d", got.Status)
	}
	if got := h.do(http.MethodGet, "/api/v1/me", token, nil); got.Status != http.StatusForbidden || got.errorCode(t) != "profile_not_provisioned" {
		t.Fatalf("me before provision = %d %s", got.Status, got.Body)
	}
	provision := h.do(http.MethodPost, "/api/v1/me/provision", token, map[string]any{"role": "admin", "id": uuid.NewString()})
	if provision.Status != http.StatusOK || provision.json(t)["role"] != "user" || provision.json(t)["id"] != orphan.String() {
		t.Fatalf("provision = %d %s; a body claiming role/id changes nothing (SC-008)", provision.Status, provision.Body)
	}
	me := h.do(http.MethodGet, "/api/v1/me", token, nil)
	if me.Status != http.StatusOK || me.json(t)["id"] != orphan.String() {
		t.Fatalf("me after provision = %d %s", me.Status, me.Body)
	}
	if got := h.do(http.MethodPost, spam, token, map[string]int{"expectedVersion": 0}); got.Status != http.StatusForbidden || got.errorCode(t) != "forbidden" {
		t.Errorf("admin route as user = %d %s", got.Status, got.Body)
	}

	for _, path := range []string{"/api/v1/events/current", "/api/v1/me/provision", "/api/v1/me", spam, "/api/v1/kudos"} {
		req := httptest.NewRequest(http.MethodOptions, path, nil)
		req.Header.Set("Origin", testOrigin)
		req.Header.Set("Access-Control-Request-Method", http.MethodPost)
		req.Header.Set("Access-Control-Request-Headers", "authorization,content-type,idempotency-key")
		rec := httptest.NewRecorder()
		h.router.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent || rec.Header().Get("Access-Control-Allow-Origin") != testOrigin {
			t.Errorf("preflight %s = %d (ACAO %q)", path, rec.Code, rec.Header().Get("Access-Control-Allow-Origin"))
		}
	}
}

// F002 SC-007 + gap log C08: a non-company token and an unverified Google
// identity get 403 domain_not_allowed and no row; ADMIN_EMAILS gets admin.
func TestProvisionThroughTheRouter(t *testing.T) {
	h := newAPIHarness(t)
	outsider := uuid.New()
	got := h.do(http.MethodPost, "/api/v1/me/provision", h.token(outsider, "someone@gmail.com"), nil)
	if got.Status != http.StatusForbidden || got.errorCode(t) != "domain_not_allowed" {
		t.Fatalf("non-company provision = %d %s", got.Status, got.Body)
	}
	_, unverified := h.sunner(testkit.SunnerSpec{NoProfile: true, Identity: &testkit.IdentitySpec{Provider: "google"}})
	if got := h.do(http.MethodPost, "/api/v1/me/provision", unverified, nil); got.Status != http.StatusForbidden ||
		got.errorCode(t) != "domain_not_allowed" {
		t.Fatalf("unverified identity provision = %d %s", got.Status, got.Body)
	}
	var rows int
	if err := h.db.Owner.QueryRow(context.Background(), `select count(*) from public.users where id = $1`, outsider).Scan(&rows); err != nil || rows != 0 {
		t.Fatalf("refused provision wrote %d rows (%v)", rows, err)
	}
	_, admin := h.sunner(testkit.SunnerSpec{Email: h.adminEmail, NoProfile: true})
	if got := h.do(http.MethodPost, "/api/v1/me/provision", admin, nil); got.Status != http.StatusOK || got.json(t)["role"] != string(db.UserRoleAdmin) {
		t.Fatalf("ADMIN_EMAILS provision = %d %s", got.Status, got.Body)
	}
}

// F003 SC-006: with no events row the PUBLIC route answers 404 event_not_found.
// The row is removed only inside a rolled-back transaction the router reads through.
func TestEventsAnswer404WithoutARow(t *testing.T) {
	h := newAPIHarness(t)
	ctx := context.Background()
	tx, err := h.db.Owner.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if _, err := tx.Exec(ctx, `delete from public.events`); err != nil {
		t.Fatal(err)
	}
	deps, _, _ := assembledDeps(t)
	deps.Queries = db.New(tx)
	router := newRouter(deps, routeRegistrations)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/events/current", nil)
	req.Header.Set("Origin", testOrigin)
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusNotFound || rec.Header().Get("Access-Control-Allow-Origin") != testOrigin {
		t.Fatalf("events without a row = %d %s", rec.Code, rec.Body)
	}
}
