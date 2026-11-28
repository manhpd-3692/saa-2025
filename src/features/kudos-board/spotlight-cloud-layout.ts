/** SPOTLIGHT_SIZE_STEPS (F006 § 4.6): name sizes in the word cloud. */
export const SPOTLIGHT_SIZE_STEPS = 5;

export interface CloudName {
  userId: string;
  name: string;
  count: number;
}

export interface PlacedName extends CloudName {
  step: number; // 1 (fewest kudos) .. SPOTLIGHT_SIZE_STEPS (most)
  x: number; // percent of the cloud width
  y: number; // percent of the cloud height
}

const COLUMNS = 6;
const ROWS = 8;

/** ALG-002: count → size step, linear between the smallest and largest count (equal counts → middle). */
export function sizeStep(count: number, min: number, max: number): number {
  if (max === min) return Math.ceil(SPOTLIGHT_SIZE_STEPS / 2);
  const t = (count - min) / (max - min);
  return 1 + Math.round(t * (SPOTLIGHT_SIZE_STEPS - 1));
}

/** Stable 32-bit hash so a Sunner keeps the same place between visits. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * Simple packed layout (ALG-002, no physics): the cloud is a COLUMNS × ROWS
 * grid whose bottom-left cells stay free for the ticker. The names take cells
 * spread evenly over the grid (every k-th cell), the busiest ones the chosen
 * cells nearest the centre; each name gets a small stable jitter inside its
 * cell. More names than cells wrap onto used cells.
 */
export function layoutCloud(names: CloudName[]): PlacedName[] {
  if (names.length === 0) return [];
  const counts = names.map((n) => n.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      if (row >= ROWS - 3 && col < 3) continue; // ticker corner
      cells.push({ col, row });
    }
  }
  const stride = Math.max(1, cells.length / names.length);
  const chosen = names.map((_, i) => cells[Math.floor(i * stride + stride / 2) % cells.length]);
  const centre = { col: (COLUMNS - 1) / 2, row: (ROWS - 1) / 2 };
  const distance = (c: { col: number; row: number }) => Math.hypot((c.col - centre.col) * 1.5, c.row - centre.row);
  chosen.sort((a, b) => distance(a) - distance(b));
  // Code-point tie-break: localeCompare differs between the server and browser ICU (hydration).
  const ranked = [...names].sort((a, b) => b.count - a.count || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0));
  return ranked.map((name, i) => {
    const cell = chosen[i];
    const h = hash(name.userId);
    const jitterX = ((h % 1000) / 1000 - 0.5) * 0.3;
    const jitterY = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.5;
    return {
      ...name,
      step: sizeStep(name.count, min, max),
      x: ((cell.col + 0.5 + jitterX) / COLUMNS) * 100,
      y: ((cell.row + 0.5 + jitterY) / ROWS) * 100,
    };
  });
}
