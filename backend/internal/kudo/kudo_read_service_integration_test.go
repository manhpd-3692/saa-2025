//go:build integration

package kudo_test

import (
	"context"
	"encoding/json"
	"errors"
	"regexp"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/kudo"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
	"github.com/manhpd-3692/saa-2025/backend/internal/upload"
)

var opaqueImageURL = regexp.MustCompile(`/object/sign/kudo-images/[0-9a-f-]{36}\.(png|jpg|webp)\?token=`)

// F005 SC-007 / F006 SC-002, SC-007 (Codex R01): an anonymous kudo with images
// read by a third Sunner carries no stable identifier of the sender anywhere —
// fields, image URLs (path and query) or HTML; the sender sees isOwn, an admin
// sees the real sender.
func TestAnonymousKudoReadByAThirdUserHidesTheSender(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	senderEmail := testkit.UniqueEmail("hidden.sender")
	sender := tdb.CreateSunner(t, testkit.SunnerSpec{Email: senderEmail, Name: "Hidden Sender Name"})
	receiver, third := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	admin := tdb.CreateSunner(t, testkit.SunnerSpec{Admin: true})
	png, _ := tdb.CreatePendingUpload(t, sender, upload.MimePNG, testkit.PNGBytes)
	in := validInput(receiver)
	in.IsAnonymous, in.ImageUploadIDs = true, []uuid.UUID{png}
	kudoID, err := newCreateService(t, tdb, notification.NewService(tdb.App)).Create(context.Background(), sender, in)
	if err != nil {
		t.Fatal(err)
	}
	reads := kudo.NewReadService(db.New(tdb.App), newStore(t))
	ctx := context.Background()

	card, err := reads.Get(ctx, kudo.Viewer{ID: third}, kudoID)
	if err != nil {
		t.Fatal(err)
	}
	raw, err := json.Marshal(card)
	if err != nil {
		t.Fatal(err)
	}
	body := string(raw)
	for _, secret := range []string{sender.String(), "Hidden Sender Name", senderEmail, strings.Split(senderEmail, "@")[0]} {
		if strings.Contains(body, secret) {
			t.Errorf("third-user card contains %q: %s", secret, body)
		}
	}
	if card.Sender != nil || card.IsOwn || len(card.Images) != 1 || card.Images[0].URL == nil ||
		!opaqueImageURL.MatchString(*card.Images[0].URL) || !card.Heart.ViewerCanHeart {
		t.Fatalf("third-user card = %s", body)
	}

	own, err := reads.Get(ctx, kudo.Viewer{ID: sender}, kudoID)
	if err != nil || own.Sender != nil || !own.IsOwn || own.Heart.ViewerCanHeart {
		t.Fatalf("sender's own card = %+v, %v; want masked sender, isOwn, cannot heart", own, err)
	}
	adminCard, err := reads.Get(ctx, kudo.Viewer{ID: admin, IsAdmin: true}, kudoID)
	if err != nil || adminCard.Sender == nil || adminCard.Sender.ID != sender {
		t.Fatalf("admin card sender = %+v, %v; want the real sender", adminCard.Sender, err)
	}
}

// F006 SC-006 (BR-006) and SC-008 (R15): a spam kudo is visible only to its
// sender and admins; a missing id is the same not-found; the card carries
// unit codes, hero tiers and the weighted heart total.
func TestDetailVisibilityAndCardShape(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	reads := kudo.NewReadService(db.New(tdb.App), newStore(t))
	sender, receiver, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()
	if _, err := tdb.Owner.Exec(ctx, `update public.users set unit_id = (select id from public.units order by code limit 1)
		where id = $1`, receiver); err != nil {
		t.Fatal(err)
	}
	spam := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Spam: true})
	public := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver})
	if _, err := tdb.Owner.Exec(ctx, `insert into public.hearts (kudo_id, user_id, weight) values ($1, $2, 2)`, public, other); err != nil {
		t.Fatal(err)
	}

	for name, viewer := range map[string]kudo.Viewer{"receiver": {ID: receiver}, "other": {ID: other}} {
		if _, err := reads.Get(ctx, viewer, spam); !errors.Is(err, kudo.ErrKudoNotFound) {
			t.Errorf("%s reading spam: err = %v, want not found", name, err)
		}
	}
	if _, err := reads.Get(ctx, kudo.Viewer{ID: other}, uuid.New()); !errors.Is(err, kudo.ErrKudoNotFound) {
		t.Errorf("missing id: err = %v, want not found", err)
	}
	if card, err := reads.Get(ctx, kudo.Viewer{ID: sender}, spam); err != nil || card.Status != db.KudoStatusSpam {
		t.Errorf("sender reading own spam: %+v, %v", card.Status, err)
	}

	card, err := reads.Get(ctx, kudo.Viewer{ID: other}, public)
	if err != nil {
		t.Fatal(err)
	}
	wantUnit := scalar[string](t, tdb, `select code from public.units order by code limit 1`)
	if card.Receiver.UnitCode == nil || *card.Receiver.UnitCode != wantUnit || card.Sender == nil || card.Sender.UnitCode != nil ||
		card.Receiver.HeroTier == nil || *card.Receiver.HeroTier != "New" || card.Heart.Total != 2 || !card.Heart.ViewerHearted ||
		card.Hashtags == nil || card.Images == nil {
		t.Fatalf("card = %+v", card)
	}
}
