package kudo

import (
	"time"

	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/db"
)

// KudoCard is the one kudo DTO every kudo-returning endpoint emits (F006 § 4.2,
// Codex R15). Consumers do not add or rename fields.
type KudoCard struct {
	ID          uuid.UUID     `json:"id"`
	CreatedAt   time.Time     `json:"createdAt"`
	Title       string        `json:"title"`
	ContentHTML string        `json:"contentHtml"`
	IsAnonymous bool          `json:"isAnonymous"`
	Sender      *PersonCard   `json:"sender"` // null when masked (BR-002)
	Receiver    PersonCard    `json:"receiver"`
	Hashtags    []string      `json:"hashtags"`
	Images      []ImageCard   `json:"images"`
	Heart       HeartCard     `json:"heart"`
	IsOwn       bool          `json:"isOwn"`
	Status      db.KudoStatus `json:"status"`
}

// PersonCard is the sender or receiver of a card.
type PersonCard struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	AvatarURL *string   `json:"avatarUrl"`
	UnitCode  *string   `json:"unitCode"` // units.code, null without a unit
	HeroTier  *string   `json:"heroTier"` // F008 tier, null without one
}

// ImageCard is one attachment. URL is a Go-signed read URL of the opaque key,
// or null when the key could not be signed (the card shows a placeholder).
type ImageCard struct {
	URL *string `json:"url"`
}

// HeartCard is the weighted heart total and the viewer's heart state (G08).
type HeartCard struct {
	Total          int64 `json:"total"`
	ViewerHearted  bool  `json:"viewerHearted"`
	ViewerCanHeart bool  `json:"viewerCanHeart"`
}
