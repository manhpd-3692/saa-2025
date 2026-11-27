//go:build integration

package kudo_test

import (
	"context"
	"errors"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

type stallingNotifier struct{}

func (stallingNotifier) Create(ctx context.Context, _ notification.CreateInput) { <-ctx.Done() }

func newStore(t *testing.T) upload.ObjectStore {
	t.Helper()
	store, err := upload.NewStorageObjectStore(os.Getenv("SUPABASE_URL"), os.Getenv("SUPABASE_SERVICE_KEY"))
	if err != nil {
		t.Fatal(err)
	}
	return store
}

func newCreateService(t *testing.T, tdb *testkit.TestDatabase, notifier notification.Notifier) *kudo.CreateService {
	t.Helper()
	return kudo.NewCreateService(tdb.App, db.New(tdb.App), upload.NewAttachmentFinalizer(newStore(t)), notifier)
}

func validInput(receiver uuid.UUID) kudo.CreateInput {
	return kudo.CreateInput{
		ReceiverID: receiver, Title: "  Người truyền cảm hứng  ", ContentHTML: `<p>Cảm ơn <strong>bạn</strong>!</p><script>x()</script>`,
		Hashtags: []string{"#Teamwork", " teamwork ", "Kaizen"},
	}
}

func scalar[T any](t *testing.T, tdb *testkit.TestDatabase, sql string, args ...any) T {
	t.Helper()
	var v T
	if err := tdb.Owner.QueryRow(context.Background(), sql, args...).Scan(&v); err != nil {
		t.Fatalf("%s: %v", sql, err)
	}
	return v
}

// F005 SC-001 + SC-006 (named): one public kudo with sanitized content,
// normalized hashtags, ordered images on attached uploads, and one
// kudo_received notice naming the sender.
func TestCreateWritesTheKudoAndNotifiesTheReceiver(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := newCreateService(t, tdb, notification.NewService(tdb.App))
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{Name: "Real Sender"}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	png, _ := tdb.CreatePendingUpload(t, sender, upload.MimePNG, testkit.PNGBytes)
	jpeg, _ := tdb.CreatePendingUpload(t, sender, upload.MimeJPEG, testkit.JPEGBytes)

	in := validInput(receiver)
	in.ImageUploadIDs = []uuid.UUID{jpeg, png}
	kudoID, err := svc.Create(context.Background(), sender, in)
	if err != nil {
		t.Fatal(err)
	}
	title := scalar[string](t, tdb, `select title from public.kudos where id = $1 and status = 'public' and sender_id = $2`, kudoID, sender)
	content := scalar[string](t, tdb, `select content from public.kudos where id = $1`, kudoID)
	tags := scalar[string](t, tdb, `select string_agg(h.name, ',' order by h.name) from public.kudo_hashtags kh
		join public.hashtags h on h.id = kh.hashtag_id where kh.kudo_id = $1`, kudoID)
	images := scalar[string](t, tdb, `select string_agg(ki.upload_id::text || ':' || ki.position || ':' || u.state, ',' order by ki.position)
		from public.kudo_images ki join public.kudo_uploads u on u.id = ki.upload_id and u.kudo_id = ki.kudo_id where ki.kudo_id = $1`, kudoID)
	if title != "Người truyền cảm hứng" || strings.Contains(content, "script") || tags != "kaizen,teamwork" ||
		images != jpeg.String()+":0:attached,"+png.String()+":1:attached" {
		t.Fatalf("stored title %q content %q tags %q images %q", title, content, tags, images)
	}
	notice := scalar[string](t, tdb, `select params->>'senderName' from public.notifications
		where recipient_id = $1 and kind = 'kudo_received' and kudo_id = $2`, receiver, kudoID)
	if notice != "Real Sender" {
		t.Fatalf("kudo_received senderName = %q, want the named sender", notice)
	}
}

// F005 SC-006 (BR-005, R23): an anonymous kudo's notice carries no sender, and
// a failing or stalled notifier still returns success within the bound.
func TestCreateNoticeAndNotifierFailures(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	in := validInput(receiver)
	in.IsAnonymous = true
	kudoID, err := newCreateService(t, tdb, notification.NewService(tdb.App)).Create(context.Background(), sender, in)
	if err != nil {
		t.Fatal(err)
	}
	params := scalar[string](t, tdb, `select params::text from public.notifications
		where recipient_id = $1 and kind = 'kudo_received' and kudo_id = $2`, receiver, kudoID)
	if strings.Contains(params, "sender") || strings.Contains(params, sender.String()) {
		t.Fatalf("anonymous kudo notice params %s carry the sender", params)
	}

	start := time.Now()
	if _, err := newCreateService(t, tdb, stallingNotifier{}).Create(context.Background(), sender, validInput(receiver)); err != nil ||
		time.Since(start) > notification.PostCommitTimeout+time.Second {
		t.Fatalf("stalled notifier: err %v after %v", err, time.Since(start))
	}
}

// F005 SC-002 (DEC-001): every broken rule answers field errors and writes nothing.
func TestCreateRefusalsWriteNothing(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := newCreateService(t, tdb, notification.NewService(tdb.App))
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	foreignOwner := tdb.CreateSunner(t, testkit.SunnerSpec{})
	foreign, _ := tdb.CreatePendingUpload(t, foreignOwner, upload.MimePNG, testkit.PNGBytes)

	mutate := map[string]func(*kudo.CreateInput){
		"self kudo":         func(in *kudo.CreateInput) { in.ReceiverID = sender },
		"missing receiver":  func(in *kudo.CreateInput) { in.ReceiverID = uuid.New() },
		"blank title":       func(in *kudo.CreateInput) { in.Title = "   " },
		"title over 100":    func(in *kudo.CreateInput) { in.Title = strings.Repeat("t", 101) },
		"content over 1000": func(in *kudo.CreateInput) { in.ContentHTML = "<p>" + strings.Repeat("a", 1001) + "</p>" },
		"empty content":     func(in *kudo.CreateInput) { in.ContentHTML = "<p>&nbsp;</p>" },
		"no hashtags":       func(in *kudo.CreateInput) { in.Hashtags = []string{" # "} },
		"six hashtags":      func(in *kudo.CreateInput) { in.Hashtags = []string{"a", "b", "c", "d", "e", "f"} },
		"foreign upload":    func(in *kudo.CreateInput) { in.ImageUploadIDs = []uuid.UUID{foreign} },
	}
	for name, change := range mutate {
		in := validInput(receiver)
		change(&in)
		_, err := svc.Create(context.Background(), sender, in)
		var invalid *kudo.ValidationError
		if !errors.As(err, &invalid) && !errors.Is(err, upload.ErrInvalidAttachment) {
			t.Errorf("%s: err = %v, want a validation or invalid_attachment refusal", name, err)
		}
	}
	if n := scalar[int](t, tdb, `select count(*) from public.kudos where sender_id = $1`, sender); n != 0 {
		t.Fatalf("refused creates wrote %d kudos", n)
	}
}

// F005 SC-010 / F008 SC-011 (R10, N04): a repeat sender causes no transition;
// two new senders committing together at 4 senders give exactly one notice.
// Both creates queue behind a test-held lock on the receiver row (the lock
// LockReceiverForKudoCreate takes) and are released together.
func TestHeroLevelUpIsEmittedOncePerTierRise(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := newCreateService(t, tdb, notification.NewService(tdb.App))
	receiver := tdb.CreateSunner(t, testkit.SunnerSpec{})
	first := tdb.CreateSunner(t, testkit.SunnerSpec{})
	for range 2 { // none -> New once, then the same sender again: no transition
		if _, err := svc.Create(context.Background(), first, validInput(receiver)); err != nil {
			t.Fatal(err)
		}
	}
	for range 3 {
		tdb.CreateKudo(t, testkit.KudoSpec{Sender: tdb.CreateSunner(t, testkit.SunnerSpec{}), Receiver: receiver})
	}
	fifthA, fifthB := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	barrier := tdb.HoldRowLock(t, `select id from public.users where id = $1 for no key update`, receiver)
	errs := barrier.RunQueued(t,
		func() error { _, err := svc.Create(context.Background(), fifthA, validInput(receiver)); return err },
		func() error { _, err := svc.Create(context.Background(), fifthB, validInput(receiver)); return err },
	)
	if errs[0] != nil || errs[1] != nil {
		t.Fatal(errs)
	}
	levels := scalar[string](t, tdb, `select string_agg(params->>'levelKey' || ':' || (params->>'sendersCount'), ',' order by created_at)
		from public.notifications where recipient_id = $1 and kind = 'hero_level_up'`, receiver)
	if levels != "New:1,Rising:5" {
		t.Fatalf("hero_level_up notices = %q, want New:1,Rising:5 (one per tier ever)", levels)
	}
}
