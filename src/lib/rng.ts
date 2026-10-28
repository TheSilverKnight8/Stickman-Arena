// A seeded random number generator whose whole state is one 32-bit number.
// It uses only integer operations, so every browser on every device gives the
// same sequence for the same seed. Game state keeps the number, so a match can
// be copied, rewound and replayed exactly.

export interface HasRng {
  rng: number;
}

/** Next value in [0, 1). Advances `holder.rng`. (mulberry32) */
export function random(holder: HasRng): number {
  holder.rng = (holder.rng + 0x6d2b79f5) | 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Whole number from 0 to n - 1. */
export function randomInt(holder: HasRng, n: number): number {
  return Math.floor(random(holder) * n);
}

/** Shuffles an array in place (Fisher-Yates). */
export function shuffle<T>(holder: HasRng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = randomInt(holder, i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/** A fresh seed for a new match. Not part of any game state. */
export function newSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] | 0;
}
