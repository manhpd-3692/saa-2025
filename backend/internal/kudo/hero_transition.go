package kudo

import (
	"github.com/google/uuid"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
	"github.com/manhpd-3692/saa-2025/backend/internal/notification"
)

// heroTransition is ALG-003 (Codex R10, N04): the receiver's distinct public
// senders counted before and after the insert, both under the receiver row
// lock, mapped with F008's tiers. Nil unless the tier rose; F005 is the only
// producer of hero_level_up and moderation never emits one (N05).
func heroTransition(receiverID, senderID uuid.UUID, before, after int) *notification.HeroTransition {
	if !gamification.HeroTierRose(before, after) {
		return nil
	}
	return &notification.HeroTransition{
		ReceiverID:   receiverID,
		ActorID:      senderID,
		FromTier:     string(gamification.HeroTierFor(before)),
		ToTier:       string(gamification.HeroTierFor(after)),
		SendersCount: after,
	}
}
