// Package upload issues signed upload URLs for kudo images and finalizes
// attachments against the real stored objects (F005 A4, A5; Codex R01, R03, N02).
package upload

import "bytes"

// The only accepted image types (BR-003; also the bucket's allowed_mime_types).
const (
	MimeJPEG = "image/jpeg"
	MimePNG  = "image/png"
	MimeWebP = "image/webp"
)

// MaxImageBytes is 5 MB (BR-003; also the bucket's file_size_limit).
const MaxImageBytes = 5 * 1024 * 1024

// SniffBytes is how much of a stored object the finalizer reads (IMAGE_SNIFF_BYTES).
const SniffBytes = 512

var (
	jpegMagic = []byte{0xFF, 0xD8, 0xFF}
	pngMagic  = []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'}
	riffMagic = []byte("RIFF")
	webpMagic = []byte("WEBP")
)

// sniffImageType returns the image type proven by the object's first bytes, or
// "" when they are not a JPEG, PNG or WebP signature.
func sniffImageType(head []byte) string {
	switch {
	case bytes.HasPrefix(head, jpegMagic):
		return MimeJPEG
	case bytes.HasPrefix(head, pngMagic):
		return MimePNG
	case len(head) >= 12 && bytes.Equal(head[:4], riffMagic) && bytes.Equal(head[8:12], webpMagic):
		return MimeWebP
	default:
		return ""
	}
}

// extensionFor is the object key extension of an accepted type ("" otherwise).
func extensionFor(mime string) string {
	switch mime {
	case MimeJPEG:
		return "jpg"
	case MimePNG:
		return "png"
	case MimeWebP:
		return "webp"
	default:
		return ""
	}
}
