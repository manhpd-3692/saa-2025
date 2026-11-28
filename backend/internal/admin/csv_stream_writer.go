package admin

import (
	"context"
	"encoding/csv"
	"mime"
	"net/http"
	"strings"

	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// utf8BOM lets Excel read Vietnamese text in the file (D004, ALG-002).
const utf8BOM = "\xEF\xBB\xBF"

// formulaLeaders are the first characters a spreadsheet may read as a formula
// (BR-004, FR-602).
const formulaLeaders = "=+-@\t\r"

// csvText neutralises a text cell (name, email, unit) that starts like a
// spreadsheet formula with a leading apostrophe (BR-004). Numbers the system
// generates are written as they are and never pass through here.
func csvText(s string) string {
	if s != "" && strings.ContainsRune(formulaLeaders, rune(s[0])) {
		return "'" + s
	}
	return s
}

// csvPageReader returns the next page of CSV records; an empty page ends the
// file. The first call is made before anything is written (Codex N11).
type csvPageReader func(ctx context.Context) ([][]string, error)

// streamCSV writes an export by ALG-002 under the Codex N11 contract:
//   - the first page is read before the status, headers or BOM are written,
//     so a failure there answers 500 JSON with no CSV byte;
//   - once streaming started the status cannot change, so a later read
//     failure aborts the connection (http.ErrAbortHandler): no terminating
//     chunk, never a normal end that would pass for a complete file;
//   - cells are quoted by encoding/csv (comma, quote, newline) with CRLF rows;
//     callers neutralise text cells with csvText.
//
// filename is ASCII (dates and fixed words); the exposed Content-Disposition
// carries it to the browser (Codex R06).
func streamCSV(ctx context.Context, w http.ResponseWriter, r *http.Request, filename string, header []string, next csvPageReader) {
	page, err := next(ctx)
	if err != nil {
		httpx.LogRequestFailure(r, err, "read export first page", "file", filename)
		httpx.WriteInternalError(w)
		return
	}

	h := w.Header()
	h.Set("Content-Type", "text/csv; charset=utf-8")
	h.Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": filename}))
	h.Set("Cache-Control", "no-store")
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)

	out := csv.NewWriter(w)
	out.UseCRLF = true
	if _, err := w.Write([]byte(utf8BOM)); err != nil {
		return // the client went away; nothing left to tell it
	}
	if err := out.Write(header); err != nil {
		return
	}
	for len(page) > 0 {
		if err := out.WriteAll(page); err != nil { // WriteAll flushes
			return
		}
		if f, ok := w.(http.Flusher); ok {
			f.Flush()
		}
		if page, err = next(ctx); err != nil {
			httpx.LogRequestFailure(r, err, "read export page after streaming started (connection aborted)", "file", filename)
			panic(http.ErrAbortHandler)
		}
	}
	out.Flush()
}
