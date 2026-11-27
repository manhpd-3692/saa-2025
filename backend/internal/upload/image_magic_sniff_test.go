package upload

import "testing"

// BR-003 (Codex R03): the stored object's first bytes decide its type, never
// the declared content type.
func TestSniffImageType(t *testing.T) {
	cases := []struct {
		name string
		head []byte
		want string
	}{
		{"jpeg", []byte{0xFF, 0xD8, 0xFF, 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'}, MimeJPEG},
		{"png", []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n', 0, 0, 0, 0x0D}, MimePNG},
		{"webp", []byte("RIFF\x24\x00\x00\x00WEBPVP8 "), MimeWebP},
		{"gif is not allowed", []byte("GIF89a\x01\x00"), ""},
		{"riff but not webp (wav)", []byte("RIFF\x24\x00\x00\x00WAVEfmt "), ""},
		{"plain text claiming to be png", []byte("hello, not an image"), ""},
		{"truncated png signature", []byte{0x89, 'P', 'N', 'G'}, ""},
		{"empty", nil, ""},
		{"svg (script-capable) is refused", []byte(`<svg xmlns="http://www.w3.org/2000/svg">`), ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := sniffImageType(tc.head); got != tc.want {
				t.Fatalf("sniffImageType = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestExtensionForMime(t *testing.T) {
	cases := map[string]string{MimeJPEG: "jpg", MimePNG: "png", MimeWebP: "webp", "image/gif": "", "": ""}
	for mime, want := range cases {
		if got := extensionFor(mime); got != want {
			t.Errorf("extensionFor(%q) = %q, want %q", mime, got, want)
		}
	}
}
