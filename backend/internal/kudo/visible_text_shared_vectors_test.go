package kudo

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

// visibleTextVector is one case of testdata/visible_text_vectors.json, the file
// the client counter's Vitest suite reads too (F005 N07, SC-004).
type visibleTextVector struct {
	Name        string `json:"name"`
	HTML        string `json:"html"`
	Text        string `json:"text"`
	Length      int    `json:"length"`
	ContentCode string `json:"contentCode"`
	Repeat      *struct {
		Token string `json:"token"`
		With  string `json:"with"`
		Times int    `json:"times"`
	} `json:"repeat"`
}

func (v visibleTextVector) expand(s string) string {
	if v.Repeat == nil {
		return s
	}
	return strings.ReplaceAll(s, v.Repeat.Token, strings.Repeat(v.Repeat.With, v.Repeat.Times))
}

func loadVisibleTextVectors(t *testing.T) []visibleTextVector {
	t.Helper()
	raw, err := os.ReadFile("testdata/visible_text_vectors.json")
	if err != nil {
		t.Fatal(err)
	}
	var file struct {
		Vectors []visibleTextVector `json:"vectors"`
	}
	if err := json.Unmarshal(raw, &file); err != nil {
		t.Fatal(err)
	}
	if len(file.Vectors) < 30 {
		t.Fatalf("only %d shared vectors loaded", len(file.Vectors))
	}
	return file.Vectors
}

// F005 SC-004 (Codex R20, N07): the server's visible text of the sanitized
// content, and the BR-004 content code, agree with every shared vector; the
// client counter is held to the same file.
func TestVisibleTextSharedVectors(t *testing.T) {
	for _, v := range loadVisibleTextVectors(t) {
		t.Run(v.Name, func(t *testing.T) {
			html, want := v.expand(v.HTML), v.expand(v.Text)
			text, n := visibleText(sanitizeContent(html))
			if text != want || n != v.Length {
				t.Fatalf("visibleText = %q (%d), want %q (%d)", text, n, want, v.Length)
			}
			if _, code := checkContent(html); code != v.ContentCode {
				t.Fatalf("checkContent code = %q, want %q", code, v.ContentCode)
			}
		})
	}
}
