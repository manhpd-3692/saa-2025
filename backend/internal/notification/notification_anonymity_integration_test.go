//go:build integration

package notification_test

import (
	"bytes"
	"context"
	"log/slog"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

func namedKudoReceived(recipient, sender, kudoID uuid.UUID) notification.CreateInput {
	return notification.CreateInput{
		RecipientID: recipient, ActorID: sender, Kind: notification.KindKudoReceived, KudoID: &kudoID,
		Params: map[string]any{
			notification.ParamSenderID: sender, notification.ParamSenderName: "Real Sender",
			notification.ParamSenderAvatarURL: "https://example.test/a.png",
		},
	}
}

func hasSenderFields(params map[string]any) bool {
	for _, key := range []string{notification.ParamSenderID, notification.ParamSenderName, notification.ParamSenderAvatarURL} {
		if _, ok := params[key]; ok {
			return true
		}
	}
	return false
}

// F009 SC-002 / BR-002: the service decides by the kudo row itself, so even a
// caller passing sender fields cannot store them for an anonymous kudo.
func TestKudoLinkedNoticeStripsSenderOfAnAnonymousKudo(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := notification.NewService(tdb.App)
	receiver, sender := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	anonymous := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Anonymous: true})
	named := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})

	create(svc, namedKudoReceived(receiver, sender, anonymous))
	create(svc, namedKudoReceived(receiver, sender, named))
	byKudo := map[uuid.UUID]storedNotice{}
	for _, n := range noticesOf(t, tdb, receiver) {
		byKudo[*n.KudoID] = n
	}
	if hasSenderFields(byKudo[anonymous].Params) {
		t.Errorf("anonymous kudo notice kept sender fields: %v", byKudo[anonymous].Params)
	}
	if byKudo[named].Params[notification.ParamSenderName] != "Real Sender" {
		t.Errorf("named kudo notice lost its sender: %v", byKudo[named].Params)
	}
}

// Codex N01 barrier: an insert that races an anonymity edit waits on the
// edit's row lock (for share vs for update), then sees is_anonymous = true and
// stores no sender; turning anonymity off later re-adds nothing.
func TestLateNoticeWaitsForAnonymityEdit(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := notification.NewService(tdb.App)
	receiver, sender := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})

	ctx := context.Background()
	edit, err := tdb.Owner.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = edit.Rollback(ctx) }()
	if _, err := edit.Exec(ctx, `select id from public.kudos where id = $1 for update`, kudoID); err != nil {
		t.Fatal(err)
	}
	if _, err := edit.Exec(ctx, `update public.kudos set is_anonymous = true where id = $1`, kudoID); err != nil {
		t.Fatal(err)
	}

	done := make(chan struct{})
	go func() {
		defer close(done)
		create(svc, namedKudoReceived(receiver, sender, kudoID))
	}()
	select {
	case <-done:
		t.Fatal("the late insert did not wait for the edit's row lock")
	case <-time.After(300 * time.Millisecond):
	}
	if err := edit.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	<-done
	if _, err := tdb.Owner.Exec(ctx, `update public.kudos set is_anonymous = false where id = $1`, kudoID); err != nil {
		t.Fatal(err)
	}

	got := noticesOf(t, tdb, receiver)
	if len(got) != 1 || hasSenderFields(got[0].Params) {
		t.Fatalf("late notice = %+v, want one notice without sender fields", got)
	}
}

// F009 SC-004 / SC-010 (BR-006, R23): a failure or a stall inside Create is
// logged and returns within the 2 s bound; nothing panics or blocks the caller.
func TestCreateFailureAndStallAreBoundedAndLogged(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := notification.NewService(tdb.App)
	receiver, sender := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	kudoID := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})

	var logs bytes.Buffer
	previous := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&logs, &slog.HandlerOptions{Level: slog.LevelWarn})))
	t.Cleanup(func() { slog.SetDefault(previous) })

	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	svc.Create(canceled, namedKudoReceived(receiver, sender, kudoID)) // immediate failure

	ctx := context.Background()
	lock, err := tdb.Owner.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = lock.Rollback(ctx) }()
	if _, err := lock.Exec(ctx, `select id from public.kudos where id = $1 for update`, kudoID); err != nil {
		t.Fatal(err)
	}
	start := time.Now()
	create(svc, namedKudoReceived(receiver, sender, kudoID)) // stalls on the row lock
	elapsed := time.Since(start)
	_ = lock.Rollback(ctx)

	if elapsed < notification.PostCommitTimeout || elapsed > notification.PostCommitTimeout+time.Second {
		t.Errorf("stalled Create returned after %v, want about %v", elapsed, notification.PostCommitTimeout)
	}
	if got := noticesOf(t, tdb, receiver); len(got) != 0 {
		t.Errorf("failed creates stored %d notices", len(got))
	}
	if n := strings.Count(logs.String(), "notification create failed"); n != 2 {
		t.Errorf("logged %d warnings, want 2: %s", n, logs.String())
	}
}
