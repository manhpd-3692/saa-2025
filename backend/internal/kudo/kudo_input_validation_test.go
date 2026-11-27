package kudo

import (
	"errors"
	"slices"
	"strings"
	"testing"

	"github.com/google/uuid"
)

// BR-002: trim, strip leading #, lower-case, drop empties, de-duplicate;
// W1: control characters refused, at most HashtagMaxChars code points.
func TestNormalizeHashtags(t *testing.T) {
	cases := []struct {
		name     string
		in       []string
		want     []string
		wantCode string
	}{
		{"BR-002 rules", []string{" #Teamwork", "teamwork", "##KAIZEN ", "#", "  ", "Sun* Spirit"},
			[]string{"teamwork", "kaizen", "sun* spirit"}, ""},
		{"Vietnamese", []string{"#TiếngViệt", "tiếngviệt", "ĐOÀN KẾT"}, []string{"tiếngviệt", "đoàn kết"}, ""},
		{"hash after space", []string{"# #Kaizen", " # # "}, []string{"kaizen"}, ""},
		{"50 runes", []string{strings.Repeat("Đ", HashtagMaxChars)}, []string{strings.Repeat("đ", HashtagMaxChars)}, ""},
		{"51 runes", []string{"ok", strings.Repeat("đ", HashtagMaxChars+1)}, nil, fieldTooLong},
		{"NUL", []string{"ok", "a\x00b"}, nil, fieldInvalid},
		{"tab inside", []string{"a\tb"}, nil, fieldInvalid},
	}
	for _, tc := range cases {
		got, code := normalizeHashtags(tc.in)
		if !slices.Equal(got, tc.want) || code != tc.wantCode {
			t.Errorf("%s: normalizeHashtags = %q, %q; want %q, %q", tc.name, got, code, tc.want, tc.wantCode)
		}
	}
}

// F005 BR-001, BR-002, BR-004: every refused field is reported at once.
func TestValidateCreateReportsEveryField(t *testing.T) {
	sender := uuid.New()
	_, err := validateCreate(sender, CreateInput{
		ReceiverID: sender, Title: strings.Repeat("t", TitleMaxChars+1), ContentHTML: "<p> </p>",
		Hashtags: []string{"a", "b", "c", "d", "e", "f"},
	})
	var invalid *ValidationError
	if !errors.As(err, &invalid) {
		t.Fatalf("err = %v, want *ValidationError", err)
	}
	want := []FieldError{{"receiverId", fieldSelfKudo}, {"title", fieldTooLong}, {"contentHtml", fieldRequired}, {"hashtags", fieldTooMany}}
	if !slices.Equal(invalid.Fields, want) {
		t.Fatalf("fields = %+v, want %+v", invalid.Fields, want)
	}

	ok, err := validateCreate(sender, CreateInput{
		ReceiverID: uuid.New(), Title: "  " + strings.Repeat("é", TitleMaxChars) + " ", ContentHTML: "<p>hi</p>",
		Hashtags: []string{"#A"},
	})
	if err != nil || ok.title != strings.Repeat("é", TitleMaxChars) || ok.content != "<p>hi</p>" || !slices.Equal(ok.hashtags, []string{"a"}) {
		t.Fatalf("valid input = %+v, %v", ok, err)
	}
	_, err = validateCreate(sender, CreateInput{Title: "t", ContentHTML: "x", Hashtags: []string{"a"}})
	if !errors.As(err, &invalid) || invalid.Fields[0] != (FieldError{"receiverId", fieldRequired}) {
		t.Fatalf("missing receiver: %v", err)
	}
}

// Reviewer W1: plain user input never reaches Postgres in a shape it refuses
// (NUL, oversized index rows, a leading `#` left after trimming): control
// characters and over-long hashtags are 422 field errors, NUL in content is
// stripped before sanitizing.
func TestValidateCreateHardensUserInput(t *testing.T) {
	sender, receiver := uuid.New(), uuid.New()
	base := func() CreateInput {
		return CreateInput{ReceiverID: receiver, Title: "Cảm ơn", ContentHTML: "<p>hi</p>", Hashtags: []string{"a"}}
	}
	refused := []struct {
		name   string
		change func(*CreateInput)
		want   FieldError
	}{
		{"NUL in title", func(in *CreateInput) { in.Title = "Thanks\x00 team" }, FieldError{"title", fieldInvalid}},
		{"DEL in title", func(in *CreateInput) { in.Title = "Thanks\x7f" }, FieldError{"title", fieldInvalid}},
		{"newline inside title", func(in *CreateInput) { in.Title = "Thanks\nteam" }, FieldError{"title", fieldInvalid}},
		{"NUL in hashtag", func(in *CreateInput) { in.Hashtags = []string{"ok", "bad\x00tag"} }, FieldError{"hashtags", fieldInvalid}},
		{"C1 control in hashtag", func(in *CreateInput) { in.Hashtags = []string{"bad\u009btag"} }, FieldError{"hashtags", fieldInvalid}},
		{"51-rune hashtag", func(in *CreateInput) { in.Hashtags = []string{strings.Repeat("ệ", HashtagMaxChars+1)} },
			FieldError{"hashtags", fieldTooLong}},
		{"only NUL content", func(in *CreateInput) { in.ContentHTML = "<p>\x00</p>" }, FieldError{"contentHtml", fieldRequired}},
	}
	for _, tc := range refused {
		in := base()
		tc.change(&in)
		_, err := validateCreate(sender, in)
		var invalid *ValidationError
		if !errors.As(err, &invalid) || !slices.Equal(invalid.Fields, []FieldError{tc.want}) {
			t.Errorf("%s: err = %v (%+v), want only %+v", tc.name, err, invalid, tc.want)
		}
	}

	in := base()
	in.Title = "\tThanks team\n" // surrounding whitespace controls are trimmed, not refused
	in.ContentHTML = "<p>a\x00b&#0;c</p>\x00"
	in.Hashtags = []string{"# #TiếngViệt", strings.Repeat("Ệ", HashtagMaxChars)}
	ok, err := validateCreate(sender, in)
	if err != nil || ok.title != "Thanks team" || strings.ContainsRune(ok.content, 0) ||
		!slices.Equal(ok.hashtags, []string{"tiếngviệt", strings.Repeat("ệ", HashtagMaxChars)}) {
		t.Fatalf("valid input = %+v, %v; want trimmed title, NUL-free content, normalized hashtags", ok, err)
	}
}

// F006 BR-002 (X05): only admins see an anonymous sender; isOwn marks the sender.
func TestMaskSender(t *testing.T) {
	sender, other := uuid.New(), uuid.New()
	cases := []struct {
		name       string
		anonymous  bool
		viewer     Viewer
		wantSender bool
		wantOwn    bool
	}{
		{"named, third user", false, Viewer{ID: other}, true, false},
		{"anonymous, third user", true, Viewer{ID: other}, false, false},
		{"anonymous, its sender", true, Viewer{ID: sender}, false, true},
		{"anonymous, admin", true, Viewer{ID: other, IsAdmin: true}, true, false},
	}
	for _, tc := range cases {
		card := KudoCard{IsAnonymous: tc.anonymous, Sender: &PersonCard{ID: sender, Name: "S"}}
		maskSender(&card, sender, tc.viewer)
		if (card.Sender != nil) != tc.wantSender || card.IsOwn != tc.wantOwn {
			t.Errorf("%s: sender %v, isOwn %v", tc.name, card.Sender, card.IsOwn)
		}
	}
}

// ALG-003 (N04): the transition carries the after-count; no rise, no event.
func TestHeroTransition(t *testing.T) {
	receiver, sender := uuid.New(), uuid.New()
	if got := heroTransition(receiver, sender, 4, 4); got != nil {
		t.Fatalf("repeat sender produced %+v", got)
	}
	got := heroTransition(receiver, sender, 4, 5)
	if got == nil || got.FromTier != "New" || got.ToTier != "Rising" || got.SendersCount != 5 || got.ReceiverID != receiver {
		t.Fatalf("4 -> 5 = %+v", got)
	}
	if first := heroTransition(receiver, sender, 0, 1); first == nil || first.FromTier != "" || first.ToTier != "New" {
		t.Fatalf("0 -> 1 = %+v", first)
	}
}
