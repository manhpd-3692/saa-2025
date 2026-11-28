package kudo

import (
	"context"
	"net/http"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// HashtagListLimit caps one answer of GET /api/v1/hashtags.
const HashtagListLimit = 50

// HashtagLister reads the shared tags (*db.Queries).
type HashtagLister interface {
	ListHashtags(ctx context.Context, arg db.ListHashtagsParams) ([]db.Hashtag, error)
}

// HashtagListHandler serves GET /api/v1/hashtags?q= (F005 A3, FR-002, FR-205).
type HashtagListHandler struct {
	queries HashtagLister
}

// NewHashtagListHandler wires the queries.
func NewHashtagListHandler(queries HashtagLister) HashtagListHandler {
	return HashtagListHandler{queries: queries}
}

type hashtagItem struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// ServeHTTP lists tags by name. The optional prefix q is normalized like a
// stored name (BR-002: trimmed, leading `#` stripped, lower-cased), so "#Team"
// finds "teamwork"; a q that can never be a valid name matches nothing.
func (h HashtagListHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	names, code := normalizeHashtags([]string{r.URL.Query().Get("q")})
	if code != "" {
		httpx.WriteJSON(w, http.StatusOK, []hashtagItem{})
		return
	}
	prefix := ""
	if len(names) == 1 {
		prefix = names[0]
	}
	ctx, cancel := dbx.RequestContext(r.Context())
	defer cancel()
	rows, err := h.queries.ListHashtags(ctx, db.ListHashtagsParams{Pattern: dbx.PrefixPattern(prefix), RowLimit: HashtagListLimit})
	if err != nil {
		httpx.LogRequestFailure(r, err, "list hashtags")
		httpx.WriteInternalError(w)
		return
	}
	items := make([]hashtagItem, len(rows))
	for i, row := range rows {
		items[i] = hashtagItem{ID: row.ID, Name: row.Name}
	}
	httpx.WriteJSON(w, http.StatusOK, items)
}
