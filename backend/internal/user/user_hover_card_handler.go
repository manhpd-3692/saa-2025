package user

import (
	"context"
	"errors"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/manhpd-3692/saa-2025/backend/internal/auth"
	"github.com/manhpd-3692/saa-2025/backend/internal/db"
	"github.com/manhpd-3692/saa-2025/backend/internal/dbx"
	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/httpx"
)

// CodeUserNotFound answers an unknown or non-uuid user id.
const CodeUserNotFound = "user_not_found"

// HoverCardReader runs GetUserHoverCard and the hero tier count (*db.Queries).
type HoverCardReader interface {
	gamification.SenderCounter
	GetUserHoverCard(ctx context.Context, arg db.GetUserHoverCardParams) (db.GetUserHoverCardRow, error)
}

// HoverCardHandler serves GET /api/v1/users/{id}/hover-card (F006 A9).
type HoverCardHandler struct {
	queries HoverCardReader
}

// NewHoverCardHandler wires the queries.
func NewHoverCardHandler(queries HoverCardReader) HoverCardHandler {
	return HoverCardHandler{queries: queries}
}

// HoverCard is the avatar info card: unitCode is units.code (Codex R15),
// unitName labels "Tên đơn vị", heroTier is F008's tier (null without one).
// isSelf tells the client not to offer the viewer as their own recipient (BR-001).
type HoverCard struct {
	ID            uuid.UUID `json:"id"`
	Name          string    `json:"name"`
	AvatarURL     *string   `json:"avatarUrl"`
	UnitCode      *string   `json:"unitCode"`
	UnitName      *string   `json:"unitName"`
	HeroTier      *string   `json:"heroTier"`
	ReceivedCount int32     `json:"receivedCount"`
	SentCount     int32     `json:"sentCount"`
	IsSelf        bool      `json:"isSelf"`
}

// ServeHTTP answers one hover card. The sent count includes the user's
// anonymous kudos only for an admin or the user themself (BR-002); the client
// never asks for a masked sender, whose id it does not have.
func (h HoverCardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	viewer, ok := auth.FromContext(r.Context())
	if !ok {
		slog.ErrorContext(r.Context(), "hover card handler used outside the PROFILE chain")
		httpx.WriteInternalError(w)
		return
	}
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.WriteError(w, http.StatusNotFound, CodeUserNotFound, "User not found.")
		return
	}
	ctx, cancel := dbx.RequestContext(r.Context())
	defer cancel()
	row, err := h.queries.GetUserHoverCard(ctx, db.GetUserHoverCardParams{
		ID: id, IncludeAnonymous: viewer.IsAdmin() || viewer.UserID == id,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.WriteError(w, http.StatusNotFound, CodeUserNotFound, "User not found.")
		return
	}
	var tiers map[uuid.UUID]gamification.HeroTier
	if err == nil {
		tiers, err = gamification.HeroTiersFor(ctx, h.queries, []uuid.UUID{id})
	}
	if err != nil {
		slog.ErrorContext(r.Context(), "read user hover card", "user_id", id, "error", err)
		httpx.WriteInternalError(w)
		return
	}
	card := HoverCard{
		ID: row.ID, Name: row.Name, AvatarURL: row.AvatarUrl, UnitCode: row.UnitCode, UnitName: row.UnitName,
		ReceivedCount: row.ReceivedCount, SentCount: row.SentCount, IsSelf: viewer.UserID == id,
	}
	if tier := tiers[id]; tier != gamification.TierNone {
		value := string(tier)
		card.HeroTier = &value
	}
	httpx.WriteJSON(w, http.StatusOK, card)
}
