package gamification

import (
	"math"
	"testing"
)

// The F010 Level filter selects by HeroTierSenderRange in SQL and shows
// HeroTierFor: both must describe the same tier at and around every bound.
func TestHeroTierSenderRangeInvertsHeroTierFor(t *testing.T) {
	for _, tier := range []HeroTier{TierNew, TierRising, TierSuper, TierLegend} {
		lo, hi, ok := HeroTierSenderRange(tier)
		if !ok || lo < 1 || hi < lo {
			t.Fatalf("%s: range [%d, %d] ok=%v", tier, lo, hi, ok)
		}
		if got := HeroTierFor(int(lo)); got != tier {
			t.Errorf("%s: HeroTierFor(lo=%d) = %q", tier, lo, got)
		}
		if got := HeroTierFor(int(lo) - 1); got == tier {
			t.Errorf("%s: HeroTierFor(lo-1=%d) is still %q", tier, lo-1, got)
		}
		if got := HeroTierFor(int(hi)); got != tier {
			t.Errorf("%s: HeroTierFor(hi=%d) = %q", tier, hi, got)
		}
		if hi != math.MaxInt32 {
			if got := HeroTierFor(int(hi) + 1); got == tier {
				t.Errorf("%s: HeroTierFor(hi+1=%d) is still %q", tier, hi+1, got)
			}
		}
	}
	for _, tier := range []HeroTier{TierNone, "Mythic"} {
		if _, _, ok := HeroTierSenderRange(tier); ok {
			t.Errorf("HeroTierSenderRange(%q) ok, want no range", tier)
		}
	}
}
