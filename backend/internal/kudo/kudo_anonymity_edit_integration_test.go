//go:build integration

package kudo_test

import (
	"context"
	"strings"
	"sync"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// heldNotifier keeps every notice a create hands over instead of storing it:
// the "post-commit insert held at a barrier" of SC-008 / F009 SC-012 (N01).
type heldNotifier struct {
	mu   sync.Mutex
	held []notification.CreateInput
}

func (n *heldNotifier) Create(_ context.Context, in notification.CreateInput) {
	n.mu.Lock()
	defer n.mu.Unlock()
	n.held = append(n.held, in)
}

// kudoReceived returns the held kudo_received notice of kudoID.
func (n *heldNotifier) kudoReceived(t *testing.T, kudoID uuid.UUID) notification.CreateInput {
	t.Helper()
	n.mu.Lock()
	defer n.mu.Unlock()
	for _, in := range n.held {
		if in.Kind == notification.KindKudoReceived && in.KudoID != nil && *in.KudoID == kudoID {
			return in
		}
	}
	t.Fatalf("no kudo_received notice held for kudo %s", kudoID)
	return notification.CreateInput{}
}

func senderFieldsIn(params string) bool {
	return strings.Contains(params, notification.ParamSenderID) || strings.Contains(params, notification.ParamSenderName) ||
		strings.Contains(params, notification.ParamSenderAvatarURL)
}

// F005 SC-008 (BR-008, FR-406, Codex R02): turning a named kudo anonymous
// removes the sender from its read and unread notices in the same commit;
// turning anonymity off again restores nothing.
func TestAnonymousEditRedactsNotifications(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{Name: "Named Sender"}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()
	kudoID, err := newCreateService(t, tdb, notification.NewService(tdb.App)).Create(ctx, sender, validInput(receiver))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := tdb.Owner.Exec(ctx, `insert into public.notifications (recipient_id, kind, params, kudo_id, read_at)
		values ($1, 'kudo_received', jsonb_build_object('senderId', $2::text, 'senderName', 'Named Sender',
		'senderAvatarUrl', 'https://example.test/a.png'), $3, now())`, receiver, sender, kudoID); err != nil {
		t.Fatal(err)
	}
	notices := func() string {
		return scalar[string](t, tdb, `select string_agg(params::text || '/' || (read_at is not null), ' ; ' order by read_at nulls first)
			from public.notifications where kudo_id = $1`, kudoID)
	}
	if got := notices(); strings.Count(got, "Named Sender") != 2 || !strings.Contains(got, "/true") || !strings.Contains(got, "/false") {
		t.Fatalf("fixture notices = %s, want one read and one unread naming the sender", got)
	}

	edit := newUpdateService(t, tdb, nil)
	form, err := edit.GetForEdit(ctx, sender, kudoID)
	if err != nil {
		t.Fatal(err)
	}
	anonymous := asUpdate(form)
	anonymous.IsAnonymous = true
	if err := edit.Update(ctx, sender, kudoID, anonymous); err != nil {
		t.Fatal(err)
	}
	if got := notices(); senderFieldsIn(got) || strings.Contains(got, sender.String()) {
		t.Fatalf("after the anonymous edit: %s", got)
	}
	if err := edit.Update(ctx, sender, kudoID, asUpdate(form)); err != nil { // named again
		t.Fatal(err)
	}
	if got := notices(); senderFieldsIn(got) || strings.Contains(got, "Named Sender") {
		t.Fatalf("turning anonymity off restored a sender: %s", got)
	}
}

// F009 SC-012 / F005 SC-008 late insert (Codex N01): named create whose notice
// insert is held -> anonymous edit -> the held named notice is stored ->
// named edit: no notice ever carries the sender. The second half races the
// insert against the anonymous edit behind a test-held kudo row lock; whichever
// commits first, nothing is stored with a sender.
func TestLateNamedNoticeAfterAnonymousEdit(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{Name: "Late Sender"}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	held := &heldNotifier{}
	create, edit, notices := newCreateService(t, tdb, held), newUpdateService(t, tdb, nil), notification.NewService(tdb.App)
	ctx := context.Background()

	for _, race := range []bool{false, true} {
		kudoID, err := create.Create(ctx, sender, validInput(receiver))
		if err != nil {
			t.Fatal(err)
		}
		late := held.kudoReceived(t, kudoID)
		if late.Params[notification.ParamSenderName] != "Late Sender" {
			t.Fatalf("held notice %+v is not the named kudo_received", late)
		}
		form, err := edit.GetForEdit(ctx, sender, kudoID)
		if err != nil {
			t.Fatal(err)
		}
		anonymous := asUpdate(form)
		anonymous.IsAnonymous = true
		if race {
			barrier := tdb.HoldRowLock(t, `select id from public.kudos where id = $1 for no key update`, kudoID)
			errs := barrier.RunQueued(t,
				func() error { return edit.Update(ctx, sender, kudoID, anonymous) },
				func() error { notices.Create(ctx, late); return nil },
			)
			if errs[0] != nil {
				t.Fatal(errs[0])
			}
		} else {
			if err := edit.Update(ctx, sender, kudoID, anonymous); err != nil {
				t.Fatal(err)
			}
			notices.Create(ctx, late)
		}
		if err := edit.Update(ctx, sender, kudoID, asUpdate(form)); err != nil { // named edit
			t.Fatal(err)
		}
		got := scalar[string](t, tdb, `select coalesce(string_agg(params::text, ' ; '), '<none>') || '|' || count(*)
			from public.notifications where kudo_id = $1`, kudoID)
		if senderFieldsIn(got) || strings.Contains(got, "Late Sender") || !strings.HasSuffix(got, "|1") {
			t.Fatalf("race=%v: stored notices %s, want exactly one notice without a sender", race, got)
		}
	}
}
