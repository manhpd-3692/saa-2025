package kudo

import (
	"strings"
	"testing"
)

const mentionSpan = `<span data-type="mention" data-id="7d0c2a51-3f3b-4c1e-9d2a-0a5b6c7d8e9f">@An</span>`

// F005 SC-004 (ALG-001 -> ALG-002, Codex R20, N07): visible text is taken from
// the sanitized HTML; inline formatting adds no character, blocks and <br> add
// one separator, whitespace collapses, entities decode, code points are counted.
func TestVisibleTextOfSanitizedContent(t *testing.T) {
	cases := []struct {
		name, html, wantText string
		wantLen              int
	}{
		{"inline formatting inside a word", `<p>a<strong>b</strong>c</p>`, "abc", 3},
		{"italic and strike add nothing", `<p><em>a</em><s>b</s>c</p>`, "abc", 3},
		{"link directly next to text", `x<a href="https://e.x">y</a>z`, "xyz", 3},
		{"mention counts as its @Name", "hi" + mentionSpan + "!", "hi@An!", 6},
		{"two paragraphs", `<p>a</p><p>b</p>`, "a b", 3},
		{"line break", `a<br>b`, "a b", 3},
		{"list items", `<ol><li>a</li><li>b</li></ol>`, "a b", 3},
		{"blockquote boundary", `a<blockquote>b</blockquote>c`, "a b c", 5},
		{"ampersand entity is one character", `<p>a&amp;b</p>`, "a&b", 3},
		{"nbsp entity collapses like a space", `<p>a&nbsp;b</p>`, "a b", 3},
		{"whitespace runs collapse and trim", "<p>  a \n\t b  </p>", "a b", 3},
		{"emoji surrogate pair is one code point", `<p>😀</p>`, "😀", 1},
		{"whitespace only", `<p>   </p><p>&nbsp;</p>`, "", 0},
		{"script only becomes empty", `<script>alert(1)</script>`, "", 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			text, n := visibleText(sanitizeContent(tc.html))
			if text != tc.wantText || n != tc.wantLen {
				t.Fatalf("visibleText = %q (%d), want %q (%d)", text, n, tc.wantText, tc.wantLen)
			}
		})
	}
}

// BR-004 boundary: exactly 1,000 code points accepted, 1,001 refused, also with
// formatting applied and with multi-byte characters.
func TestCheckContentLengthBoundary(t *testing.T) {
	plain := func(n int) string { return "<p>" + strings.Repeat("a", n) + "</p>" }
	formatted := func(n int) string {
		return "<p><strong>" + strings.Repeat("a", n-2) + "</strong><em>b</em>" +
			`<a href="https://example.com">c</a></p>`
	}
	emoji := func(n int) string { return "<p>" + strings.Repeat("😀", n) + "</p>" }
	for name, build := range map[string]func(int) string{"plain": plain, "formatted": formatted, "emoji": emoji} {
		t.Run(name, func(t *testing.T) {
			if _, code := checkContent(build(ContentMaxChars)); code != "" {
				t.Fatalf("%d code points refused with %q", ContentMaxChars, code)
			}
			if _, code := checkContent(build(ContentMaxChars + 1)); code != fieldTooLong {
				t.Fatalf("%d code points: code %q, want %q", ContentMaxChars+1, code, fieldTooLong)
			}
		})
	}
	for _, empty := range []string{"", "   ", "<p> </p>", "<script>x</script>", "<img src=x onerror=alert(1)>"} {
		if _, code := checkContent(empty); code != fieldRequired {
			t.Errorf("checkContent(%q) code = %q, want %q", empty, code, fieldRequired)
		}
	}
}

// ALG-001: unsafe links, event handlers and unsupported tags are stripped from
// the stored HTML; allowed formatting and mentions survive.
func TestSanitizeContentStripsUnsafeMarkup(t *testing.T) {
	cases := []struct {
		name, html string
		mustNot    []string
		must       []string
	}{
		{"javascript link", `<a href="javascript:alert(1)">x</a>`, []string{"javascript", "href"}, []string{"x"}},
		{"event handler", `<p onclick="steal()">a</p>`, []string{"onclick", "steal"}, []string{"<p>a</p>"}},
		{"image and iframe", `<img src="https://e.x/a.png" onerror="x"><iframe src="https://e.x"></iframe>b`, []string{"<img", "<iframe", "onerror"}, []string{"b"}},
		{"style and class", `<p style="color:red" class="x">a</p>`, []string{"style", "class"}, []string{"<p>a</p>"}},
		{"data uri link", `<a href="data:text/html,<script>x</script>">d</a>`, []string{"data:", "<script"}, []string{"d"}},
		{"allowed formatting", `<p><strong>b</strong><em>i</em><s>s</s></p><ol><li>l</li></ol><blockquote>q</blockquote>`,
			nil, []string{"<strong>b</strong>", "<em>i</em>", "<s>s</s>", "<ol><li>l</li></ol>", "<blockquote>q</blockquote>"}},
		{"mention keeps its user id", "hi" + mentionSpan, nil, []string{`data-type="mention"`, `data-id="7d0c2a51-3f3b-4c1e-9d2a-0a5b6c7d8e9f"`}},
		{"mention with a forged id loses it", `<span data-type="mention" data-id="x' onmouseover='y">@An</span>`, []string{"data-id", "onmouseover"}, []string{"@An"}},
		{"safe link gets rel", `<a href="https://example.com/x">x</a>`, nil, []string{`href="https://example.com/x"`, "noopener", "noreferrer"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			clean := sanitizeContent(tc.html)
			for _, s := range tc.mustNot {
				if strings.Contains(clean, s) {
					t.Errorf("sanitized %q still contains %q", clean, s)
				}
			}
			for _, s := range tc.must {
				if !strings.Contains(clean, s) {
					t.Errorf("sanitized %q lost %q", clean, s)
				}
			}
		})
	}
}
