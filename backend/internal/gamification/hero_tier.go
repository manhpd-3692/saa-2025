// Package gamification holds hearts, hero tiers and secret boxes (F008).
package gamification

// HeroTier is the badge derived from a Sunner's distinct senders over public
// kudos received (BR-005). It is computed on read and never stored.
type HeroTier string

// Tier keys (translated on render). TierNone means no badge (DEC-003).
const (
	TierNone   HeroTier = ""
	TierNew    HeroTier = "New"
	TierRising HeroTier = "Rising"
	TierSuper  HeroTier = "Super"
	TierLegend HeroTier = "Legend"
)

// BR-005 thresholds: New 1–4, Rising 5–9, Super 10–20, Legend more than 20.
const (
	risingFromSenders = 5
	superFromSenders  = 10
	legendFromSenders = 21
)

// HeroTierFor maps a distinct-sender count to its tier (ALG-001).
func HeroTierFor(senders int) HeroTier {
	switch {
	case senders <= 0:
		return TierNone
	case senders < risingFromSenders:
		return TierNew
	case senders < superFromSenders:
		return TierRising
	case senders < legendFromSenders:
		return TierSuper
	default:
		return TierLegend
	}
}

// HeroTierRose reports whether moving from `before` to `after` distinct senders
// reaches a higher tier (F005 ALG-003, Codex R10).
func HeroTierRose(before, after int) bool {
	return tierRank(HeroTierFor(after)) > tierRank(HeroTierFor(before))
}

func tierRank(t HeroTier) int {
	switch t {
	case TierNew:
		return 1
	case TierRising:
		return 2
	case TierSuper:
		return 3
	case TierLegend:
		return 4
	default:
		return 0
	}
}
