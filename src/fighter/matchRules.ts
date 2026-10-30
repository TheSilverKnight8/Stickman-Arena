import { FPS } from './sim/step';

// Match rules (Caleb's request): time limit, stocks and best of. Set on the
// CPU and Watch setups, and online by the room creator. A best of 3 or 5 goes
// straight from one game into the next with the same fighters and stage, until
// someone has won enough games; a drawn game does not count.

export interface MatchRules {
  /** Minutes on the clock, or null for no time limit. */
  minutes: number | null;
  stocks: number;
  bestOf: number;
}

export const DEFAULT_RULES: MatchRules = { minutes: 3, stocks: 3, bestOf: 1 };
export const TIME_OPTIONS: (number | null)[] = [2, 3, 5, 8, null];
export const STOCK_OPTIONS = [1, 2, 3, 4, 5];
export const BEST_OF_OPTIONS = [1, 3, 5];

/** Games a fighter has to win to take the set. */
export const winsNeeded = (r: MatchRules) => Math.floor(r.bestOf / 2) + 1;

/** What a match is set up with: stocks each and the time limit in frames (null: none). */
export function matchSettings(r: MatchRules): { stocks: number; time: number | null } {
  return { stocks: r.stocks, time: r.minutes === null ? null : r.minutes * 60 * FPS };
}

/** "3 stocks · 3 minutes · best of 3". */
export function rulesText(r: MatchRules): string {
  const time = r.minutes === null ? 'no time limit' : `${r.minutes} ${r.minutes === 1 ? 'minute' : 'minutes'}`;
  const stocks = `${r.stocks} ${r.stocks === 1 ? 'stock' : 'stocks'}`;
  return `${stocks} · ${time} · ${r.bestOf === 1 ? 'one game' : `best of ${r.bestOf}`}`;
}

/** Rules from another device, checked: anything not on offer gives null. */
export function checkRules(x: unknown): MatchRules | null {
  const r = x as MatchRules;
  if (!r || typeof r !== 'object') return null;
  if (!TIME_OPTIONS.includes(r.minutes) || !STOCK_OPTIONS.includes(r.stocks) || !BEST_OF_OPTIONS.includes(r.bestOf)) return null;
  return { minutes: r.minutes, stocks: r.stocks, bestOf: r.bestOf };
}

/** A set in progress: games won so far by each fighter, and which game this is (from 1). */
export interface SetScore {
  wins: number[];
  game: number;
}

/** After a game: the new score, and the set's winner once someone has won enough (-1: not yet). */
export function scoreGame(rules: MatchRules, set: SetScore, winner: number | null): { set: SetScore; setWinner: number } {
  const wins = [...set.wins];
  if (winner !== null && winner >= 0) wins[winner] = (wins[winner] ?? 0) + 1;
  const need = winsNeeded(rules);
  const setWinner = wins.findIndex((w) => w >= need);
  return { set: { wins, game: set.game + 1 }, setWinner };
}
