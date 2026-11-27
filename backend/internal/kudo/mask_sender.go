package kudo

import "github.com/google/uuid"

// Viewer is the caller a card is built for; IsAdmin comes from users.role.
type Viewer struct {
	ID      uuid.UUID
	IsAdmin bool
}

// maskSender is the single place that hides an anonymous sender (X05, BR-002):
// the sender is nulled for everyone except admins, and isOwn tells the real
// sender the kudo is theirs. senderID never leaves the server otherwise.
func maskSender(card *KudoCard, senderID uuid.UUID, viewer Viewer) {
	card.IsOwn = senderID == viewer.ID
	if card.IsAnonymous && !viewer.IsAdmin {
		card.Sender = nil
	}
}
