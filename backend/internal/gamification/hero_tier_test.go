package gamification_test

import (
	"testing"

	"github.com/manhpd-3692/saa-2025/backend/internal/gamification"
)

// F008 SC-005 (BR-005, ALG-001): senders 0, 1, 4, 5, 9, 10, 20, 21 map to
// none, New, New, Rising, Rising, Super, Super, Legend.
func TestHeroTierForBoundaries(t *testing.T) {
	cases := []struct {
		senders int
		want    gamification.HeroTier
	}{
		{0, gamification.TierNone}, {1, gamification.TierNew}, {4, gamification.TierNew},
		{5, gamification.TierRising}, {9, gamification.TierRising}, {10, gamification.TierSuper},
		{20, gamification.TierSuper}, {21, gamification.TierLegend}, {500, gamification.TierLegend},
		{-1, gamification.TierNone},
	}
	for _, tc := range cases {
		if got := gamification.HeroTierFor(tc.senders); got != tc.want {
			t.Errorf("HeroTierFor(%d) = %q, want %q", tc.senders, got, tc.want)
		}
	}
}

// F005 ALG-003: only a rise to a higher tier is a transition.
func TestHeroTierRose(t *testing.T) {
	cases := []struct {
		before, after int
		want          bool
	}{
		{0, 1, true}, {1, 2, false}, {4, 5, true}, {5, 5, false}, {9, 10, true},
		{20, 21, true}, {21, 22, false}, {5, 4, false},
	}
	for _, tc := range cases {
		if got := gamification.HeroTierRose(tc.before, tc.after); got != tc.want {
			t.Errorf("HeroTierRose(%d, %d) = %v, want %v", tc.before, tc.after, got, tc.want)
		}
	}
}
