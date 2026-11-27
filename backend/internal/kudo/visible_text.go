package kudo

import (
	"strings"
	"unicode/utf8"

	"golang.org/x/net/html"
	"golang.org/x/net/html/atom"
)

// fragmentContext parses content as the children of a <body>.
var fragmentContext = &html.Node{Type: html.ElementNode, Data: "body", DataAtom: atom.Body}

// visibleText is ALG-002 (Codex R20, N07), shared with the client counter:
// walk the sanitized HTML in document order, concatenate text nodes with no
// inserted separator (entities decoded by the parser; a mention contributes
// its displayed `@Name`), add one "\n" for every <br> and around every block
// (p, li, blockquote), then collapse every whitespace run to one space and
// trim. Returns the text and its length in Unicode code points.
func visibleText(sanitized string) (string, int) {
	nodes, err := html.ParseFragment(strings.NewReader(sanitized), fragmentContext)
	if err != nil {
		// Only a failing reader errors; a strings.Reader never does.
		return "", 0
	}
	var b strings.Builder
	for _, n := range nodes {
		writeVisible(n, &b)
	}
	text := strings.Join(strings.Fields(b.String()), " ")
	return text, utf8.RuneCountInString(text)
}

func writeVisible(n *html.Node, b *strings.Builder) {
	switch n.Type {
	case html.TextNode:
		b.WriteString(n.Data)
	case html.ElementNode:
		if n.DataAtom == atom.Br {
			b.WriteByte('\n')
			return
		}
		block := n.DataAtom == atom.P || n.DataAtom == atom.Li || n.DataAtom == atom.Blockquote
		if block {
			b.WriteByte('\n')
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			writeVisible(c, b)
		}
		if block {
			b.WriteByte('\n')
		}
	}
}
