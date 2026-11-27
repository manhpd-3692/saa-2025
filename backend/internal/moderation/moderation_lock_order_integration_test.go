//go:build integration

package moderation_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/moderation"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

// F011 SC-012 / F005 SC-010 (Codex N05): receiver R has four public distinct
// senders and a Spam kudo from a fifth. A create from a repeat sender and the
// restore of the fifth sender's kudo are held behind R's row lock and released
// together, in both orders: they serialize on R (kudo -> receiver lock order),
// neither emits hero_level_up, nothing deadlocks, and R reads as Rising.
func TestRestoreAndRepeatSenderCreateSerializeOnTheReceiver(t *testing.T) {
	for _, createFirst := range []bool{true, false} {
		name := map[bool]string{true: "create queued first", false: "restore queued first"}[createFirst]
		t.Run(name, func(t *testing.T) { raceRestoreWithCreate(t, createFirst) })
	}
}

func raceRestoreWithCreate(t *testing.T, createFirst bool) {
	tdb := testkit.OpenTestDatabase(t)
	notifier := notification.NewService(tdb.App)
	store, err := upload.NewStorageObjectStore(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY"))
	if err != nil {
		t.Fatal(err)
	}
	creates := kudo.NewCreateService(tdb.App, db.New(tdb.App), upload.NewAttachmentFinalizer(store), notifier)
	decisions := moderation.NewService(tdb.App, notifier)

	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	receiver := tdb.CreateSunner(t, testkit.SunnerSpec{})
	repeat := tdb.CreateSunner(t, testkit.SunnerSpec{})
	tdb.CreateKudo(t, testkit.KudoSpec{Sender: repeat, Receiver: receiver})
	for range 3 {
		tdb.CreateKudo(t, testkit.KudoSpec{Sender: tdb.CreateSunner(t, testkit.SunnerSpec{}), Receiver: receiver})
	}
	spammed := tdb.CreateKudo(t, testkit.KudoSpec{Sender: tdb.CreateSunner(t, testkit.SunnerSpec{}), Receiver: receiver, Spam: true})

	ctx := context.Background()
	barrier, err := tdb.Owner.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = barrier.Rollback(ctx) }()
	if _, err := barrier.Exec(ctx, `select id from public.users where id = $1 for no key update`, receiver); err != nil {
		t.Fatal(err)
	}

	errs := make(chan error, 2)
	create := func() {
		_, err := creates.Create(ctx, repeat, kudo.CreateInput{
			ReceiverID: receiver, Title: "Again", ContentHTML: "<p>Thanks again</p>", Hashtags: []string{"again"},
		})
		errs <- err
	}
	restore := func() {
		_, err := decisions.SetStatus(ctx, admin, spammed, db.KudoStatusPublic, 0)
		errs <- err
	}
	first, second := create, restore
	if !createFirst {
		first, second = restore, create
	}
	go first()
	time.Sleep(200 * time.Millisecond) // queue behind the barrier in a known order
	go second()
	time.Sleep(200 * time.Millisecond)
	if err := barrier.Rollback(ctx); err != nil {
		t.Fatal(err)
	}
	for range 2 {
		select {
		case err := <-errs:
			if err != nil {
				t.Fatal(err)
			}
		case <-time.After(10 * time.Second):
			t.Fatal("create and restore did not both finish (deadlock?)")
		}
	}

	if n := count(t, tdb, `select count(*) from public.notifications where recipient_id = $1 and kind = 'hero_level_up'`, receiver); n != 0 {
		t.Fatalf("hero_level_up notices = %d, want 0 (repeat sender; moderation never emits one)", n)
	}
	if n := count(t, tdb, `select count(distinct sender_id) from public.kudos where receiver_id = $1 and status = 'public'`, receiver); n != 5 {
		t.Fatalf("distinct public senders = %d, want 5 (Rising)", n)
	}
}
