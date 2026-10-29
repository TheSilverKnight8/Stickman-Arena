import { CHARS } from './sim/chars';
import type { CharId } from './sim/types';

// What the character select screen says about each fighter. Strengths and
// weaknesses are the spec's table, word for word.

export const ROSTER: Record<CharId, { strengths: string; weaknesses: string }> = {
  fisticuffs: { strengths: 'Good mobility, aggressive tools', weaknesses: 'Light, poor neutral (struggles to approach)' },
  spartan: { strengths: 'Great range, coverage and disjoints', weaknesses: 'Not very mobile, relies on stray hits for damage' },
  ranger: { strengths: 'Average mobility and survivability, plenty of ranged tools', weaknesses: 'Less effective close up, needs precision to use well' },
  buster: { strengths: 'Great survivability and damage, decent neutral', weaknesses: 'Low speed, easily comboed' },
  phantom: { strengths: 'Excellent mobility, safe moves', weaknesses: 'Inconsistent damage and kill power, poor survivability and defense' },
  valkyrie: { strengths: 'Great air mobility, four jumps, stronger aerials, vertical combos', weaknesses: 'Poor ground mobility, poor move range' },
};

/** 1 to 5 ratings worked out from the actual numbers, so they always match how the fighter plays. */
export function ratings(id: CharId) {
  const all = Object.values(CHARS);
  const scale = (v: number, values: number[]) => {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    return hi === lo ? 3 : 1 + Math.round(((v - lo) / (hi - lo)) * 4);
  };
  const jumpHeight = (c: (typeof all)[number]) => (c.stats.jump ** 2 + c.stats.doubleJump ** 2 * (c.stats.airJumps ?? 1)) / (2 * c.stats.gravity);
  const c = CHARS[id];
  return {
    weight: scale(c.stats.weight, all.map((x) => x.stats.weight)),
    speed: scale(c.stats.run, all.map((x) => x.stats.run)),
    jump: scale(jumpHeight(c), all.map(jumpHeight)),
  };
}
