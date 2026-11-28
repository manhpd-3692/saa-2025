package kudo

import (
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
)

// Content rules (F005 § 4.6).
const (
	ContentMaxChars = 1000 // BR-004, code points of canonical visible text (ALG-002)
	TitleMaxChars   = 100  // BR-004
	HashtagsMax     = 5    // BR-002
	// HashtagMaxChars caps one normalized hashtag (code points) so its unique
	// index row stays far below the btree limit (reviewer W1).
	HashtagMaxChars = 50
)

// Field error codes of a 422 `validation_failed` answer (DEC-001).
const (
	fieldRequired    = "required"
	fieldInvalid     = "invalid" // a control character (NUL included) inside the value
	fieldTooLong     = "too_long"
	fieldTooMany     = "too_many"
	fieldSelfKudo    = "self_kudo"
	fieldUnavailable = "unavailable"
)

// FieldError names one refused field.
type FieldError struct {
	Field string `json:"field"`
	Code  string `json:"code"`
}

// ValidationError lists every refused field; nothing is written (SC-002).
type ValidationError struct {
	Fields []FieldError
}

func (e *ValidationError) Error() string { return "kudo input is invalid" }

// CreateInput is the POST /api/v1/kudos body. The sender is never part of it:
// it comes from the verified token.
type CreateInput struct {
	ReceiverID     uuid.UUID   `json:"receiverId"`
	Title          string      `json:"title"`
	ContentHTML    string      `json:"contentHtml"`
	Hashtags       []string    `json:"hashtags"`
	ImageUploadIDs []uuid.UUID `json:"imageUploadIds"`
	IsAnonymous    bool        `json:"isAnonymous"`
}

// UpdateInput is the PATCH /api/v1/kudos/{id} body (F005 A7): the create
// fields except the recipient, which is locked (a receiverId sent anyway is
// ignored). ImageUploadIDs is the complete, ordered list to keep.
type UpdateInput struct {
	Title          string      `json:"title"`
	ContentHTML    string      `json:"contentHtml"`
	Hashtags       []string    `json:"hashtags"`
	ImageUploadIDs []uuid.UUID `json:"imageUploadIds"`
	IsAnonymous    bool        `json:"isAnonymous"`
}

// validKudo is the stored representation after every content rule passed.
type validKudo struct {
	title    string
	content  string // sanitized HTML (ALG-001)
	hashtags []string
}

// validateCreate applies BR-001, BR-002 and BR-004 on the stored
// representation (Codex R20). Attachments are checked by the finalizer.
func validateCreate(senderID uuid.UUID, in CreateInput) (validKudo, error) {
	var fields []FieldError
	switch {
	case in.ReceiverID == uuid.Nil:
		fields = append(fields, FieldError{"receiverId", fieldRequired})
	case in.ReceiverID == senderID:
		fields = append(fields, FieldError{"receiverId", fieldSelfKudo}) // BR-001
	}
	valid, bodyFields := validateBody(in.Title, in.ContentHTML, in.Hashtags)
	return validResult(valid, append(fields, bodyFields...))
}

// validateUpdate applies the same BR-002 and BR-004 rules as create (A7).
func validateUpdate(in UpdateInput) (validKudo, error) {
	return validResult(validateBody(in.Title, in.ContentHTML, in.Hashtags))
}

func validResult(valid validKudo, fields []FieldError) (validKudo, error) {
	if len(fields) > 0 {
		return validKudo{}, &ValidationError{Fields: fields}
	}
	return valid, nil
}

// validateBody checks title, content and hashtags, reporting every refused field.
func validateBody(rawTitle, rawContent string, rawHashtags []string) (validKudo, []FieldError) {
	var fields []FieldError
	title, code := checkTitle(rawTitle)
	if code != "" {
		fields = append(fields, FieldError{"title", code})
	}
	content, code := checkContent(rawContent)
	if code != "" {
		fields = append(fields, FieldError{"contentHtml", code})
	}
	hashtags, code := normalizeHashtags(rawHashtags)
	switch {
	case code != "":
		fields = append(fields, FieldError{"hashtags", code})
	case len(hashtags) == 0:
		fields = append(fields, FieldError{"hashtags", fieldRequired})
	case len(hashtags) > HashtagsMax:
		fields = append(fields, FieldError{"hashtags", fieldTooMany})
	}
	return validKudo{title: title, content: content, hashtags: hashtags}, fields
}

func checkTitle(raw string) (string, string) {
	title := strings.TrimSpace(raw)
	switch {
	case title == "":
		return "", fieldRequired
	case hasControl(title): // single-line field; NUL would also fail in Postgres
		return "", fieldInvalid
	case utf8.RuneCountInString(title) > TitleMaxChars:
		return "", fieldTooLong
	}
	return title, ""
}

// checkContent: sanitize first, then required and max length on the visible
// text of what will be stored (ALG-001 -> ALG-002 -> BR-004).
func checkContent(raw string) (string, string) {
	clean := sanitizeContent(raw)
	_, n := visibleText(clean)
	switch {
	case n == 0:
		return "", fieldRequired
	case n > ContentMaxChars:
		return "", fieldTooLong
	}
	return clean, ""
}

// normalizeHashtags is BR-002: trim, strip every leading `#` (also "# #x"),
// lower-case, drop empties, de-duplicate (first occurrence keeps its place).
// A name with a control character inside is refused as invalid and one over
// HashtagMaxChars as too_long (W1). strings.ToLower agrees with the database's
// ICU lower() that hashtags_name_normalized applies (proved over every graphic
// code point by TestHashtagLowerCaseMatchesTheDatabase).
func normalizeHashtags(names []string) ([]string, string) {
	out := make([]string, 0, len(names))
	seen := make(map[string]struct{}, len(names))
	for _, raw := range names {
		name := strings.TrimLeftFunc(raw, func(r rune) bool { return r == '#' || unicode.IsSpace(r) })
		name = strings.ToLower(strings.TrimRightFunc(name, unicode.IsSpace))
		switch {
		case name == "":
			continue
		case hasControl(name):
			return nil, fieldInvalid
		case utf8.RuneCountInString(name) > HashtagMaxChars:
			return nil, fieldTooLong
		}
		if _, dup := seen[name]; dup {
			continue
		}
		seen[name] = struct{}{}
		out = append(out, name)
	}
	return out, ""
}

// hasControl reports a C0/C1 control character (NUL, DEL, newline, ...).
func hasControl(s string) bool {
	return strings.ContainsFunc(s, unicode.IsControl)
}
