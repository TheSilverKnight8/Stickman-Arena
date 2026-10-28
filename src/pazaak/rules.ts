import { randomInt, shuffle } from '../lib/rng';
import { HAND_SIZE, MAX_TABLE, SETS_TO_WIN, TARGET, card, needsSign } from './cards';

// Pazaak rules as Caleb wrote them (docs/pazaak.md). Every function here is
// pure: it takes a state and returns a new one, so the CPU game and the online
// host run exactly the same logic.

export type Seat = 0 | 1;

export interface TableCard {
  value: number;
  /** Side-card id when it came from the hand; missing for main-deck cards. */
  id?: string;
}

export interface PlayerState {
  /** Four side-deck cards dealt at the start of the match. null once played. "?" when hidden from the viewer. */
  hand: (string | null)[];
  table: TableCard[];
  standing: boolean;
  playedThisTurn: boolean;
  /** Played a tiebreaker during this set. */
  tiebreaker: boolean;
  sets: number;
}

export type SetReason = 'bust' | 'stand' | 'nine' | 'tiebreaker' | 'tie';

export interface SetResult {
  winner: Seat | null;
  reason: SetReason;
  totals: [number, number];
}

export type PazaakEvent =
  | { type: 'draw'; seat: Seat; value: number }
  | { type: 'play'; seat: Seat; id: string; value: number }
  | { type: 'stand'; seat: Seat }
  | { type: 'endTurn'; seat: Seat; timeout: boolean }
  | { type: 'bust'; seat: Seat }
  | { type: 'shuffle' }
  | { type: 'set'; result: SetResult }
  | { type: 'match'; winner: Seat };

export interface PazaakState {
  rng: number;
  /** Main deck draw pile; the top card is the last one. Empty in a view sent to a guest. */
  deck: number[];
  /** Main-deck cards from finished sets. They go back in when the draw pile runs out. */
  discard: number[];
  deckLeft: number;
  players: [PlayerState, PlayerState];
  turn: Seat;
  firstThisSet: Seat;
  /** Counts every set played, ties included. */
  setNumber: number;
  /** Goes up by one each turn. Timers use it to know which turn they belong to. */
  turnId: number;
  phase: 'turn' | 'setOver' | 'matchOver';
  lastSet: SetResult | null;
  winner: Seat | null;
  /** What the last action did, for sounds and animations. */
  events: PazaakEvent[];
  /** Goes up by one per action, so a screen plays each batch of events once. */
  version: number;
}

export type PazaakAction =
  | { type: 'play'; seat: Seat; slot: number; sign?: 1 | -1 }
  | { type: 'endTurn'; seat: Seat }
  | { type: 'stand'; seat: Seat }
  | { type: 'timeout'; seat: Seat; turnId: number }
  | { type: 'nextSet' };

export const other = (s: Seat): Seat => (s === 0 ? 1 : 0);

export function total(p: PlayerState) {
  return p.table.reduce((n, c) => n + c.value, 0);
}

function newPlayer(hand: string[]): PlayerState {
  return { hand, table: [], standing: false, playedThisTurn: false, tiebreaker: false, sets: 0 };
}

/** Starts a match. `decks` are the two 10-card side decks. The first set's first player is random. */
export function newMatch(seed: number, decks: [string[], string[]]): PazaakState {
  const s: PazaakState = {
    rng: seed,
    deck: [],
    discard: [],
    deckLeft: 0,
    players: [newPlayer([]), newPlayer([])],
    turn: 0,
    firstThisSet: 0,
    setNumber: 1,
    turnId: 0,
    phase: 'turn',
    lastSet: null,
    winner: null,
    events: [],
    version: 0,
  };
  // Main deck: four each of 1 to 10, shared.
  for (let v = 1; v <= 10; v++) for (let i = 0; i < 4; i++) s.deck.push(v);
  shuffle(s, s.deck);
  // Each hand is 4 random cards from that player's side deck, kept for the whole match.
  s.players.forEach((p, i) => {
    p.hand = shuffle(s, [...decks[i]]).slice(0, HAND_SIZE);
  });
  s.firstThisSet = randomInt(s, 2) as Seat;
  s.turn = s.firstThisSet;
  beginTurn(s);
  s.deckLeft = s.deck.length;
  return s;
}

/** Applies one action. Actions that are not allowed right now return the state unchanged. */
export function apply(prev: PazaakState, action: PazaakAction): PazaakState {
  if (!allowed(prev, action)) return prev;
  const s = structuredClone(prev);
  s.events = [];
  s.version++;

  switch (action.type) {
    case 'play': {
      const p = s.players[action.seat];
      const id = p.hand[action.slot]!;
      const c = card(id);
      const sign = needsSign(id) ? (action.sign ?? 1) : c.kind === 'minus' ? -1 : 1;
      const value = sign * c.value;
      p.hand[action.slot] = null;
      p.table.push({ value, id });
      p.playedThisTurn = true;
      if (c.kind === 'tiebreaker') p.tiebreaker = true;
      s.events.push({ type: 'play', seat: action.seat, id, value });
      checkNine(s, action.seat);
      break;
    }
    case 'endTurn':
    case 'timeout': {
      s.events.push({ type: 'endTurn', seat: action.seat, timeout: action.type === 'timeout' });
      endTurn(s, action.seat);
      break;
    }
    case 'stand': {
      const p = s.players[action.seat];
      if (total(p) > TARGET) {
        bust(s, action.seat);
        break;
      }
      p.standing = true;
      s.events.push({ type: 'stand', seat: action.seat });
      afterStand(s);
      break;
    }
    case 'nextSet': {
      for (const p of s.players) {
        for (const c of p.table) if (c.id === undefined) s.discard.push(c.value);
        p.table = [];
        p.standing = false;
        p.playedThisTurn = false;
        p.tiebreaker = false;
      }
      // Players take turns drawing first, set by set (tied sets included).
      s.firstThisSet = other(s.firstThisSet);
      s.turn = s.firstThisSet;
      s.setNumber++;
      s.phase = 'turn';
      beginTurn(s);
      break;
    }
  }
  s.deckLeft = s.deck.length;
  return s;
}

export function allowed(s: PazaakState, a: PazaakAction): boolean {
  if (a.type === 'nextSet') return s.phase === 'setOver';
  if (s.phase !== 'turn' || a.seat !== s.turn) return false;
  const p = s.players[a.seat];
  if (p.standing) return false;
  switch (a.type) {
    case 'play':
      return !p.playedThisTurn && p.table.length < MAX_TABLE && Number.isInteger(a.slot) && typeof p.hand[a.slot] === 'string' && p.hand[a.slot] !== '?' && (a.sign === undefined || a.sign === 1 || a.sign === -1);
    case 'timeout':
      return a.turnId === s.turnId;
    default:
      return true;
  }
}

/** Start of a turn: the player draws from the main deck automatically. */
function beginTurn(s: PazaakState) {
  const seat = s.turn;
  const p = s.players[seat];
  if (s.deck.length === 0) {
    // The main deck lasts the whole match. When it runs out, the used cards are shuffled back in.
    s.deck = shuffle(s, s.discard);
    s.discard = [];
    s.events.push({ type: 'shuffle' });
  }
  const value = s.deck.pop()!;
  p.table.push({ value });
  p.playedThisTurn = false;
  s.turnId++;
  s.events.push({ type: 'draw', seat, value });
  checkNine(s, seat);
}

/** Nine cards in play: the player stands automatically and wins the set. No more cards can be added, so over 20 is a bust. */
function checkNine(s: PazaakState, seat: Seat) {
  if (s.phase !== 'turn') return;
  const p = s.players[seat];
  if (p.table.length < MAX_TABLE) return;
  if (total(p) > TARGET) bust(s, seat);
  else {
    p.standing = true;
    s.events.push({ type: 'stand', seat });
    endSet(s, { winner: seat, reason: 'nine', totals: totals(s) });
  }
}

function endTurn(s: PazaakState, seat: Seat) {
  // Over 20 only counts at the end of the turn.
  if (total(s.players[seat]) > TARGET) return bust(s, seat);
  // The opponent keeps taking turns while the other player stands, and the other way round.
  s.turn = s.players[other(seat)].standing ? seat : other(seat);
  beginTurn(s);
}

function afterStand(s: PazaakState) {
  const [a, b] = s.players;
  if (a.standing && b.standing) return resolve(s);
  s.turn = a.standing ? 1 : 0;
  beginTurn(s);
}

/** Both players stand: the higher total wins. A tie goes to whoever played a tiebreaker this set; otherwise it counts for nobody. */
function resolve(s: PazaakState) {
  const t = totals(s);
  if (t[0] !== t[1]) return endSet(s, { winner: t[0] > t[1] ? 0 : 1, reason: 'stand', totals: t });
  const [a, b] = s.players;
  if (a.tiebreaker !== b.tiebreaker) return endSet(s, { winner: a.tiebreaker ? 0 : 1, reason: 'tiebreaker', totals: t });
  endSet(s, { winner: null, reason: 'tie', totals: t });
}

function bust(s: PazaakState, seat: Seat) {
  s.events.push({ type: 'bust', seat });
  endSet(s, { winner: other(seat), reason: 'bust', totals: totals(s) });
}

function endSet(s: PazaakState, result: SetResult) {
  s.lastSet = result;
  s.phase = 'setOver';
  s.events.push({ type: 'set', result });
  if (result.winner === null) return;
  const w = s.players[result.winner];
  w.sets++;
  if (w.sets >= SETS_TO_WIN) {
    s.phase = 'matchOver';
    s.winner = result.winner;
    s.events.push({ type: 'match', winner: result.winner });
  }
}

function totals(s: PazaakState): [number, number] {
  return [total(s.players[0]), total(s.players[1])];
}

/** The state as one player may see it: the other hand is face down and the deck order is hidden. */
export function viewFor(s: PazaakState, seat: Seat): PazaakState {
  const v = structuredClone(s);
  v.deck = [];
  v.discard = [];
  v.rng = 0;
  const opp = v.players[other(seat)];
  opp.hand = opp.hand.map((h) => (h === null ? null : '?'));
  return v;
}
