//go:build integration

package gamification_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"sync"
	"testing"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
	"github.com/manhpd-3692/saa-2025/backend/internal/testkit"
)

// scriptedRandom feeds the icon draw predetermined bytes (byte i < 6 = icon i
// in enum order), safely across goroutines.
type scriptedRandom struct {
	mu   sync.Mutex
	data []byte
}

func (s *scriptedRandom) Read(p []byte) (int, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if len(s.data) == 0 {
		return 0, io.EOF
	}
	n := copy(p, s.data)
	s.data = s.data[n:]
	return n, nil
}

var iconOrder = []string{"REVIVAL", "TOUCH_OF_LIGHT", "STAY_GOLD", "FLOW_TO_HORIZON", "BEYOND_THE_BOUNDARY", "ROOT_FURTHER"}

// giveBoxes inserts `unopened` boxes plus one opened box per icon in `opened`.
func giveBoxes(t *testing.T, tdb *testkit.TestDatabase, user uuid.UUID, unopened int, opened ...string) {
	t.Helper()
	ctx := context.Background()
	seq := 0
	for _, icon := range opened {
		seq++
		if _, err := tdb.Owner.Exec(ctx, `insert into public.secret_boxes (user_id, seq, opened_at, icon)
			values ($1, $2, now(), $3::secret_box_icon)`, user, seq, icon); err != nil {
			t.Fatal(err)
		}
	}
	for range unopened {
		seq++
		if _, err := tdb.Owner.Exec(ctx, `insert into public.secret_boxes (user_id, seq) values ($1, $2)`, user, seq); err != nil {
			t.Fatal(err)
		}
	}
}

type openResult struct {
	BoxID   uuid.UUID `json:"boxId"`
	Icon    string    `json:"icon"`
	Summary struct {
		Unopened      int      `json:"unopened"`
		Opened        int      `json:"opened"`
		DistinctIcons []string `json:"distinctIcons"`
	} `json:"summary"`
}

func decodeOpen(t *testing.T, raw json.RawMessage) openResult {
	t.Helper()
	var r openResult
	if err := json.Unmarshal(raw, &r); err != nil {
		t.Fatalf("decode %s: %v", raw, err)
	}
	return r
}

func unopenedCount(t *testing.T, tdb *testkit.TestDatabase, user uuid.UUID) int {
	t.Helper()
	var n int
	if err := tdb.Owner.QueryRow(context.Background(),
		`select count(*) from public.secret_boxes where user_id = $1 and opened_at is null`, user).Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

// F008 SC-006 (BR-007, DEC-004): one open sets opened_at, icon and
// open_request_id on one box; with nothing left a new key gets ErrNoUnopenedBox.
func TestOpenConsumesOneBoxThenRefusesWhenEmpty(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := gamification.NewSecretBoxService(tdb.App, &recordingNotifier{}, &scriptedRandom{data: []byte{2}})
	user := tdb.CreateSunner(t, testkit.SunnerSpec{})
	giveBoxes(t, tdb, user, 1)

	ctx := context.Background()
	key := uuid.New()
	raw, err := svc.Open(ctx, user, key)
	if err != nil {
		t.Fatal(err)
	}
	r := decodeOpen(t, raw)
	var icon string
	var storedKey uuid.UUID
	if err := tdb.Owner.QueryRow(ctx, `select icon::text, open_request_id from public.secret_boxes
		where id = $1 and opened_at is not null`, r.BoxID).Scan(&icon, &storedKey); err != nil {
		t.Fatal(err)
	}
	if icon != "STAY_GOLD" || r.Icon != icon || storedKey != key || r.Summary.Unopened != 0 || r.Summary.Opened != 1 ||
		len(r.Summary.DistinctIcons) != 1 {
		t.Fatalf("open = %+v (stored icon %s, key %s)", r, icon, storedKey)
	}
	if _, err := svc.Open(ctx, user, uuid.New()); !errors.Is(err, gamification.ErrNoUnopenedBox) {
		t.Fatalf("open with zero left: err = %v, want ErrNoUnopenedBox", err)
	}
}

// F008 SC-012 (BR-010, R11): two concurrent opens reaching the 5th and 6th
// icon complete the set exactly once; a later open completes nothing. Both
// opens queue behind a test-held lock on the user row (the lock
// LockUserForSecretBoxOpen takes) and are released together.
func TestConcurrentOpensCompleteTheSetOnce(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	notes := &recordingNotifier{}
	svc := gamification.NewSecretBoxService(tdb.App, notes, &scriptedRandom{data: []byte{4, 5, 0}})
	user := tdb.CreateSunner(t, testkit.SunnerSpec{})
	giveBoxes(t, tdb, user, 2, iconOrder[:4]...)

	ctx := context.Background()
	barrier := tdb.HoldRowLock(t, `select id from public.users where id = $1 for no key update`, user)
	errs := barrier.RunQueued(t,
		func() error { _, err := svc.Open(ctx, user, uuid.New()); return err },
		func() error { _, err := svc.Open(ctx, user, uuid.New()); return err },
	)
	for _, err := range errs {
		if err != nil {
			t.Fatal(err)
		}
	}
	if _, err := tdb.Owner.Exec(ctx, `insert into public.secret_boxes (user_id, seq) values ($1, 99)`, user); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Open(ctx, user, uuid.New()); err != nil {
		t.Fatal(err)
	}
	var completedAt *string
	if err := tdb.Owner.QueryRow(ctx, `select icons_completed_at::text from public.users where id = $1`, user).Scan(&completedAt); err != nil {
		t.Fatal(err)
	}
	if completedAt == nil || notes.kinds()[notification.KindIconsCompleted] != 1 {
		t.Fatalf("icons_completed_at = %v, completion events %v; want set once, one event", completedAt, notes.kinds())
	}
}

// F008 SC-013 / SC-014 (R12, N12): a retried key replays its stored result
// byte-for-byte and consumes nothing, even after another open; two concurrent
// requests with one key consume one box.
func TestOpenReplaysTheStoredResultForAKey(t *testing.T) {
	tdb := testkit.OpenTestDatabase(t)
	svc := gamification.NewSecretBoxService(tdb.App, &recordingNotifier{}, &scriptedRandom{data: []byte{0, 1, 2, 3}})
	user := tdb.CreateSunner(t, testkit.SunnerSpec{})
	giveBoxes(t, tdb, user, 4)
	ctx := context.Background()

	keyA, keyB, keyC := uuid.New(), uuid.New(), uuid.New()
	first, err := svc.Open(ctx, user, keyA) // response "lost"
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.Open(ctx, user, keyB); err != nil {
		t.Fatal(err)
	}
	replay, err := svc.Open(ctx, user, keyA)
	if err != nil || !bytes.Equal(first, replay) {
		t.Fatalf("replay = %s, %v; want the stored %s", replay, err, first)
	}
	if r := decodeOpen(t, replay); r.Summary.Unopened != 3 || r.Summary.Opened != 1 {
		t.Fatalf("replayed summary %+v, want the counts right after A (3 unopened, 1 opened)", r.Summary)
	}

	results := make([]json.RawMessage, 2)
	errs := startTogether(
		func() (err error) { results[0], err = svc.Open(ctx, user, keyC); return err },
		func() (err error) { results[1], err = svc.Open(ctx, user, keyC); return err },
	)
	if errs[0] != nil || errs[1] != nil || !bytes.Equal(results[0], results[1]) {
		t.Fatalf("same key twice at once: %v / %v, bodies %s vs %s", errs[0], errs[1], results[0], results[1])
	}
	if got := unopenedCount(t, tdb, user); got != 1 {
		t.Fatalf("unopened = %d, want 1 (keys A, B, C each consumed exactly one of 4)", got)
	}
}
