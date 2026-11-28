package kudo

import "github.com/google/uuid"

// Viewer is the caller a card is built for; IsAdmin comes from users.role.
type Viewer struct {
	ID      uuid.UUID
	IsAdmin bool
}

// SenderShownTo is the one anonymity rule (G04, X05): the sender of an
// anonymous kudo is shown to admins only. maskSender and the admin review
// list (F011 BR-004) both apply it.
func SenderShownTo(isAnonymous bool, viewer Viewer) bool {
	return !isAnonymous || viewer.IsAdmin
}

// maskSender is the single place that hides an anonymous sender (X05, BR-002):
// the sender is nulled for everyone except admins, and isOwn tells the real
// sender the kudo is theirs. senderID never leaves the server otherwise.
func maskSender(card *KudoCard, senderID uuid.UUID, viewer Viewer) {
	card.IsOwn = senderID == viewer.ID
	if !SenderShownTo(card.IsAnonymous, viewer) {
		card.Sender = nil
	}
}
