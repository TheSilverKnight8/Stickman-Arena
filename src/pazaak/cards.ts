import { newSeed, randomInt, type HasRng } from '../lib/rng';

// The side-deck card pool from the spec: 19 cards.
//   Plain:      +1 to +6 and -1 to -6
//   ± ("flip"): ±1 to ±6 (the player picks plus or minus when playing it)
//   Tiebreaker: ±1T (a ±1 card; wins a set that ends tied on two stands)
// Not in the game: 2&4, 3&6, the double card and 1±2.

export type SideKind = 'plus' | 'minus' | 'flip' | 'tiebreaker';

export interface SideCard {
  id: string;
  kind: SideKind;
  value: number;
}

export const DECK_SIZE = 10;
export const HAND_SIZE = 4;
export const MAX_COPIES = 2;
export const TARGET = 20;
export const MAX_TABLE = 9;
export const SETS_TO_WIN = 3;

const range = [1, 2, 3, 4, 5, 6];

export const POOL: SideCard[] = [
  ...range.map((v) => ({ id: `+${v}`, kind: 'plus' as const, value: v })),
  ...range.map((v) => ({ id: `-${v}`, kind: 'minus' as const, value: v })),
  ...range.map((v) => ({ id: `±${v}`, kind: 'flip' as const, value: v })),
  { id: '±1T', kind: 'tiebreaker', value: 1 },
];

const byId = new Map(POOL.map((c) => [c.id, c]));

export function card(id: string): SideCard {
  const c = byId.get(id);
  if (!c) throw new Error(`Unknown Pazaak card ${id}`);
  return c;
}

export function isSideCardId(id: unknown): id is string {
  return typeof id === 'string' && byId.has(id);
}

/** Whether the player picks plus or minus when playing this card. */
export function needsSign(id: string) {
  const k = card(id).kind;
  return k === 'flip' || k === 'tiebreaker';
}

/** How the card shows: "+3", "−3", "±3", "±1T". Uses a real minus sign. */
export function cardLabel(id: string) {
  return id.replace('-', '−');
}

export function copiesOf(deck: string[], id: string) {
  return deck.reduce((n, x) => (x === id ? n + 1 : n), 0);
}

/** A side deck is 10 cards from the pool with no more than 2 copies of any card. */
export function deckProblem(deck: unknown): string | null {
  if (!Array.isArray(deck)) return 'The deck is missing.';
  if (deck.length !== DECK_SIZE) return `A deck has ${DECK_SIZE} cards.`;
  for (const id of deck) {
    if (!isSideCardId(id)) return 'The deck has a card that is not in the pool.';
    if (copiesOf(deck, id) > MAX_COPIES) return `A deck can hold at most ${MAX_COPIES} of each card.`;
  }
  return null;
}

/** Fills a deck (or the empty slots of one) with random cards from `pool`, keeping the 2-copy limit. */
export function randomDeck(pool: SideCard[] = POOL, start: string[] = [], holder: HasRng = { rng: newSeed() }): string[] {
  const deck = [...start];
  while (deck.length < DECK_SIZE) {
    const choices = pool.filter((c) => copiesOf(deck, c.id) < MAX_COPIES);
    deck.push(choices[randomInt(holder, choices.length)].id);
  }
  return sortDeck(deck);
}

/** Pool order: plus, minus, ±, tiebreaker, then by value. */
export function sortDeck(deck: string[]) {
  const order = new Map(POOL.map((c, i) => [c.id, i]));
  return [...deck].sort((a, b) => order.get(a)! - order.get(b)!);
}
