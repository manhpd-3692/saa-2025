//go:build integration

package main

import (
	"bytes"
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// F008 heart and box-open handlers (review N4): a caller who hangs up while
// the transaction waits on its row lock is logged at INFO, never ERROR, and
// nothing is written. The request passes the auth chain first; a test-held
// lock (the one the handler's transaction takes) keeps it inside the handler
// until the caller cancels.
func TestGamificationMutationsLogCallerCancellationAtInfo(t *testing.T) {
	h := newAPIHarness(t)
	sender, _ := h.sunner(testkit.SunnerSpec{})
	receiver, _ := h.sunner(testkit.SunnerSpec{})
	opener, openerToken := h.sunner(testkit.SunnerSpec{})
	_, fanToken := h.sunner(testkit.SunnerSpec{})
	kudoID := h.db.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	if _, err := h.db.Owner.Exec(context.Background(), `insert into public.secret_boxes (user_id, seq) values ($1, 1)`, opener); err != nil {
		t.Fatal(err)
	}
	var logs bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewTextHandler(&logs, nil)))
	t.Cleanup(func() { slog.SetDefault(previous) })

	for _, tc := range []struct {
		name, method, path, token, lockSQL string
		lockArg                            any
		headers                            map[string]string
		written                            string
	}{
		{"heart", http.MethodPut, "/api/v1/kudos/" + kudoID.String() + "/heart", fanToken,
			`select id from public.kudos where id = $1 for no key update`, kudoID, nil,
			`select count(*) from public.hearts where kudo_id = '` + kudoID.String() + `'`},
		{"box open", http.MethodPost, "/api/v1/me/secret-boxes/open", openerToken,
			`select id from public.users where id = $1 for no key update`, opener, map[string]string{"Idempotency-Key": uuid.NewString()},
			`select count(*) from public.secret_boxes where user_id = '` + opener.String() + `' and opened_at is not null`},
	} {
		logs.Reset()
		barrier := h.db.HoldRowLock(t, tc.lockSQL, tc.lockArg)
		ctx, hangUp := context.WithCancel(context.Background())
		req := httptest.NewRequest(tc.method, tc.path, nil).WithContext(ctx)
		req.Header.Set("Origin", testOrigin)
		req.Header.Set("Authorization", "Bearer "+tc.token)
		for k, v := range tc.headers {
			req.Header.Set(k, v)
		}
		done := make(chan int)
		go func() {
			rec := httptest.NewRecorder()
			h.router.ServeHTTP(rec, req)
			done <- rec.Code
		}()
		barrier.WaitForWaiters(t, 1) // the handler's transaction waits on the lock
		hangUp()
		code := <-done
		barrier.Release(t)
		out := logs.String()
		if code != http.StatusInternalServerError || !strings.Contains(out, "level=INFO") || strings.Contains(out, "level=ERROR") {
			t.Errorf("%s cancelled by the caller: %d, logs %q; want 500 logged at INFO only", tc.name, code, out)
		}
		var n int
		if err := h.db.Owner.QueryRow(context.Background(), tc.written).Scan(&n); err != nil || n != 0 {
			t.Errorf("%s: %d rows written after the cancelled request (%v), want 0", tc.name, n, err)
		}
	}
}
