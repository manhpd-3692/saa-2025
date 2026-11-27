/**
 * LED-style digit drawn as SVG segments (D008 fallback: the "Digital Numbers"
 * font is not licensed for web use, so no font file ships). Geometry is traced
 * from the Countdown - Prelaunch reference (docs/figma-refs/user/countdown-prelaunch.png):
 * a 37 x 74 px glyph, 7.5 px segments with 45° mitred ends, unlit segments hidden.
 */

const SEGMENT_POINTS = {
  a: "2.5,0 34.5,0 27,7.5 10,7.5",
  b: "37,3.5 37,35.5 29.5,28 29.5,11",
  c: "37,38.5 37,70.5 29.5,63 29.5,46",
  d: "10,66.5 27,66.5 34.5,74 2.5,74",
  e: "0,38.5 7.5,46 7.5,63 0,70.5",
  f: "0,3.5 7.5,11 7.5,28 0,35.5",
  g: "4,37 7.75,33.25 29.25,33.25 33,37 29.25,40.75 7.75,40.75",
} as const;

type Segment = keyof typeof SEGMENT_POINTS;

const LIT_SEGMENTS: Record<string, readonly Segment[]> = {
  "0": ["a", "b", "c", "d", "e", "f"],
  "1": ["b", "c"],
  "2": ["a", "b", "g", "e", "d"],
  "3": ["a", "b", "g", "c", "d"],
  "4": ["f", "g", "b", "c"],
  "5": ["a", "f", "g", "c", "d"],
  "6": ["a", "f", "g", "e", "c", "d"],
  "7": ["a", "b", "c"],
  "8": ["a", "b", "c", "d", "e", "f", "g"],
  "9": ["a", "b", "c", "d", "f", "g"],
};

export function SevenSegmentDigit({ digit }: { digit: string }) {
  return (
    <svg viewBox="0 0 37 74" width={37} height={74} fill="currentColor" aria-hidden="true">
      {(LIT_SEGMENTS[digit] ?? []).map((segment) => (
        <polygon key={segment} points={SEGMENT_POINTS[segment]} />
      ))}
    </svg>
  );
}
