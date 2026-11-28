//go:build integration

package kudo_test

import (
	"context"
	"errors"
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

// newUpdateService wires the edit service over the real pool and Storage; a nil
// cleaner means the production StorageCleaner.
func newUpdateService(t *testing.T, tdb *testkit.TestDatabase, cleaner upload.PendingDeleteCleaner) *kudo.UpdateService {
	t.Helper()
	store := newStore(t)
	if cleaner == nil {
		cleaner = upload.NewStorageCleaner(db.New(tdb.App), store)
	}
	return kudo.NewUpdateService(tdb.App, db.New(tdb.App), upload.NewAttachmentFinalizer(store), cleaner, store)
}

// asUpdate turns a prefill back into an edit body, keeping every image.
func asUpdate(form kudo.EditForm) kudo.UpdateInput {
	ids := make([]uuid.UUID, len(form.Images))
	for i, img := range form.Images {
		ids[i] = img.UploadID
	}
	return kudo.UpdateInput{Title: form.Title, ContentHTML: form.ContentHTML, Hashtags: form.Hashtags,
		ImageUploadIDs: ids, IsAnonymous: form.IsAnonymous}
}

func kudoSnapshot(t *testing.T, tdb *testkit.TestDatabase, id uuid.UUID) string {
	t.Helper()
	return scalar[string](t, tdb, `select k.title || '|' || k.content || '|' || k.is_anonymous || '|' || k.updated_at::text || '|' ||
		coalesce((select string_agg(h.name, ',' order by h.name) from public.kudo_hashtags kh
		join public.hashtags h on h.id = kh.hashtag_id where kh.kudo_id = k.id), '')
		from public.kudos k where k.id = $1`, id)
}

// F005 SC-003 (FR-601/602, BR-006): a non-author, a spam kudo or a missing
// kudo is refused on prefill and on save, and nothing is written.
func TestEditRefusalsWriteNothing(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	edit := newUpdateService(t, tdb, nil)
	sender, receiver, other := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{})
	ctx := context.Background()
	named, err := newCreateService(t, tdb, notification.NewService(tdb.App)).Create(ctx, sender, validInput(receiver))
	if err != nil {
		t.Fatal(err)
	}
	spam := tdb.CreateKudo(t, testkit.KudoSpec{Sender: sender, Receiver: receiver, Spam: true})
	before := map[uuid.UUID]string{named: kudoSnapshot(t, tdb, named), spam: kudoSnapshot(t, tdb, spam)}
	otherUpload, _ := tdb.CreatePendingUpload(t, other, upload.MimePNG, testkit.PNGBytes)
	body := kudo.UpdateInput{Title: "Changed", ContentHTML: "<p>changed</p>", Hashtags: []string{"changed"}, IsAnonymous: true}

	cases := []struct {
		name   string
		viewer uuid.UUID
		id     uuid.UUID
		in     kudo.UpdateInput
		want   error
	}{
		{"non-author", other, named, kudo.UpdateInput{Title: "x", ImageUploadIDs: []uuid.UUID{otherUpload}}, kudo.ErrNotKudoAuthor},
		{"spam kudo, its author", sender, spam, body, kudo.ErrKudoSpam},
		{"spam kudo, someone else", other, spam, body, kudo.ErrKudoNotFound},
		{"missing kudo", sender, uuid.New(), body, kudo.ErrKudoNotFound},
	}
	for _, tc := range cases {
		if _, err := edit.GetForEdit(ctx, tc.viewer, tc.id); !errors.Is(err, tc.want) {
			t.Errorf("%s: GetForEdit err = %v, want %v", tc.name, err, tc.want)
		}
		if err := edit.Update(ctx, tc.viewer, tc.id, tc.in); !errors.Is(err, tc.want) {
			t.Errorf("%s: Update err = %v, want %v", tc.name, err, tc.want)
		}
	}
	invalid := []kudo.UpdateInput{
		{Title: " ", ContentHTML: "<p>ok</p>", Hashtags: []string{"a"}},
		{Title: "ok", ContentHTML: "<p>" + strings.Repeat("a", kudo.ContentMaxChars+1) + "</p>", Hashtags: []string{"a"}},
		{Title: "ok", ContentHTML: "<p>ok</p>", Hashtags: []string{"a"}, ImageUploadIDs: []uuid.UUID{otherUpload}},
	}
	for i, in := range invalid {
		err := edit.Update(ctx, sender, named, in)
		var fields *kudo.ValidationError
		if !errors.As(err, &fields) && !errors.Is(err, upload.ErrInvalidAttachment) {
			t.Errorf("invalid edit %d: err = %v, want a 422 refusal", i, err)
		}
	}
	for id, snapshot := range before {
		if got := kudoSnapshot(t, tdb, id); got != snapshot {
			t.Errorf("refused edits changed kudo %s: %q -> %q", id, snapshot, got)
		}
	}
}

// F005 US008 / FR-403 (A6, A7, N02): the prefill shows the locked receiver and
// committed images; a save replaces title, content, hashtags and images
// (kept + new in the new order), and the removed image is deleted after commit.
func TestEditSavesTheAuthorsChanges(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	store := newStore(t)
	sender, receiver := tdb.CreateSunner(t, testkit.SunnerSpec{}), tdb.CreateSunner(t, testkit.SunnerSpec{Name: "Locked Receiver"})
	x, xPath := tdb.CreatePendingUpload(t, sender, upload.MimePNG, testkit.PNGBytes)
	y, _ := tdb.CreatePendingUpload(t, sender, upload.MimeJPEG, testkit.JPEGBytes)
	in := validInput(receiver)
	in.ImageUploadIDs = []uuid.UUID{x, y}
	ctx := context.Background()
	kudoID, err := newCreateService(t, tdb, notification.NewService(tdb.App)).Create(ctx, sender, in)
	if err != nil {
		t.Fatal(err)
	}
	edit := newUpdateService(t, tdb, nil)
	form, err := edit.GetForEdit(ctx, sender, kudoID)
	if err != nil || form.Receiver.ID != receiver || form.Receiver.Name != "Locked Receiver" || len(form.Images) != 2 ||
		form.Images[0].UploadID != x || form.Images[0].URL == nil || strings.Join(form.Hashtags, ",") != "kaizen,teamwork" {
		t.Fatalf("prefill = %+v, %v", form, err)
	}

	z, _ := tdb.CreatePendingUpload(t, sender, upload.MimePNG, testkit.PNGBytes)
	time.Sleep(10 * time.Millisecond) // updated_at must move past created_at
	err = edit.Update(ctx, sender, kudoID, kudo.UpdateInput{
		Title: "Tiêu đề mới", ContentHTML: `<p>Mới <em>hơn</em></p><img src=x onerror=y>`, Hashtags: []string{"#Kaizen", "Growth"},
		ImageUploadIDs: []uuid.UUID{y, z},
	})
	if err != nil {
		t.Fatal(err)
	}
	stored := scalar[string](t, tdb, `select title || '|' || content || '|' || (updated_at > created_at) from public.kudos where id = $1`, kudoID)
	tags := scalar[string](t, tdb, `select string_agg(h.name, ',' order by h.name) from public.kudo_hashtags kh
		join public.hashtags h on h.id = kh.hashtag_id where kh.kudo_id = $1`, kudoID)
	images := scalar[string](t, tdb, `select string_agg(ki.upload_id::text || ':' || ki.position || ':' || u.state, ',' order by ki.position)
		from public.kudo_images ki join public.kudo_uploads u on u.id = ki.upload_id where ki.kudo_id = $1`, kudoID)
	if stored != "Tiêu đề mới|<p>Mới <em>hơn</em></p>|true" || tags != "growth,kaizen" ||
		images != y.String()+":0:attached,"+z.String()+":1:attached" {
		t.Fatalf("after edit: kudo %q tags %q images %q", stored, tags, images)
	}
	if n := scalar[int](t, tdb, `select count(*) from public.kudo_uploads where id = $1`, x); n != 0 {
		t.Fatalf("removed upload row still exists after the post-commit cleanup")
	}
	if _, err := store.ObjectInfo(ctx, xPath); !errors.Is(err, upload.ErrObjectNotFound) {
		t.Fatalf("removed object still in Storage: %v", err)
	}
}
