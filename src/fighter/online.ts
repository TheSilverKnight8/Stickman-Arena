import { newSeed, randomInt, type HasRng } from '../lib/rng';
import { createStore } from '../lib/store';
import { Room, RoomError, type RoomMessage } from '../net/room';
import { Rollback, hashState, type RollbackMessage } from '../net/rollback';
import { DEFAULT_RULES, matchSettings, scoreGame, type MatchRules, type SetScore } from './matchRules';
import { CHAR_IDS } from './sim/chars';
import { STAGE_IDS } from './sim/stages';
import { createMatch, endInDraw, step } from './sim/step';
import type { CharId, MatchState, SimEvent, StageId } from './sim/types';
import type { FightDriver } from './ui/FightView';

// An online Platfighter room (2 players). The room creator's device runs the
// lobby: it applies both players' picks and votes, settles anything random,
// and sends everyone the same lobby. The match itself runs on both devices
// with rollback netcode (src/net/rollback.ts).
//
// Room flow (spec): character select → stage select → match → back to
// character select (the rematch). Character select has the leave button.
// The room creator sets the match rules (time, stocks, best of); in a best of
// 3 or 5 the room goes straight from one game into the next with the same
// fighters and stage, and back to character select once the set is won.

export type Pick = CharId | 'random';
export type Vote = StageId | 'random';

export interface Seat {
  here: boolean;
  pick: Pick | null;
  ready: boolean;
  vote: Vote | null;
  /** The fighter actually played (Random settled), once both are ready. */
  char: CharId | null;
}

export interface Lobby {
  phase: 'chars' | 'stages' | 'reveal' | 'match';
  seats: Seat[];
  /** What each vote became, and the stage chosen (shown during "reveal"). */
  votedStages: (StageId | null)[];
  stage: StageId | null;
  /** Counts matches (games) in this room. */
  match: number;
  seed: number;
  /** Set by the room creator. */
  rules: MatchRules;
  /** The set in progress: games won by each seat, and the game being played. */
  set: SetScore;
  /** How the last game left the set, for its result screen (null before any). */
  last: { match: number; wins: number[]; setWinner: number; done: boolean } | null;
}

export interface FighterRoomState {
  status: 'connecting' | 'open' | 'closed' | 'error';
  role: 'host' | 'guest';
  code: string;
  error: string | null;
  notice: string | null;
  lobby: Lobby;
  mySeat: number;
  /** The running match (changes when a match starts). */
  driver: OnlineDriver | null;
  /** The opponent left or lost connection during the match. */
  disconnected: boolean;
}

const PLAYERS = 2;
const REVEAL_MS = 2600;
const BACK_TO_SELECT_MS = 5000;
/** Between games of a set: the score shows this long, then the next game starts. */
export const NEXT_GAME_MS = 4000;
/** Waiting this long for the other device's buttons counts as a lost connection. */
const STALL_LIMIT_FRAMES = 8 * 60;
export const INPUT_DELAY = 2;
export const MAX_PREDICT = 10;

const emptySeat = (here = false): Seat => ({ here, pick: null, ready: false, vote: null, char: null });
const freshSet = (): SetScore => ({ wins: [0, 0], game: 1 });
const freshLobby = (): Lobby => ({
  phase: 'chars',
  seats: [emptySeat(true), emptySeat()],
  votedStages: [null, null],
  stage: null,
  match: 0,
  seed: 0,
  rules: DEFAULT_RULES,
  set: freshSet(),
  last: null,
});

/** Back to character select: nobody ready, no votes, a new set. */
function toCharacterSelect(l: Lobby) {
  l.phase = 'chars';
  for (const seat of l.seats) {
    seat.ready = false;
    seat.vote = null;
  }
  l.set = freshSet();
  l.last = null;
}

const blank: FighterRoomState = {
  status: 'closed',
  role: 'host',
  code: '',
  error: null,
  notice: null,
  lobby: freshLobby(),
  mySeat: 0,
  driver: null,
  disconnected: false,
};

export const fighterRoom = createStore<FighterRoomState>({ ...blank });
const patch = (p: Partial<FighterRoomState>) => fighterRoom.set((s) => ({ ...s, ...p }));

let room: Room | null = null;
let timers: number[] = [];
/** Match messages that arrive before this device has started that match. */
let early: RollbackMessage[] = [];
const hostRng: HasRng = { rng: newSeed() };

function later(ms: number, fn: () => void) {
  timers.push(window.setTimeout(fn, ms));
}
function clearTimers() {
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
}

// ---------------------------------------------------------------- the match driver

export interface OnlineMatchConfig {
  stage: StageId;
  chars: CharId[];
  seed: number;
  match: number;
  rules: MatchRules;
}

/** Runs one online match: rollback over the room connection. */
export class OnlineDriver implements FightDriver {
  readonly rollback: Rollback<MatchState, SimEvent>;
  readonly config: OnlineMatchConfig;
  private ended = false;

  constructor(config: OnlineMatchConfig, mySeat: number, send: (m: RollbackMessage) => void) {
    this.config = config;
    const initial = createMatch({ stage: config.stage, chars: config.chars, seed: config.seed, ...matchSettings(config.rules) });
    this.rollback = new Rollback<MatchState, SimEvent>({ step, clone: (s) => structuredClone(s) }, initial, {
      players: PLAYERS,
      local: mySeat,
      inputDelay: INPUT_DELAY,
      maxPredict: MAX_PREDICT,
      match: config.match,
      authority: mySeat === 0,
      send,
      hash: hashState,
    });
  }

  get state() {
    return this.rollback.state;
  }

  tick(local: number): SimEvent[] {
    if (this.ended) return [];
    const events = this.rollback.tick(local);
    // The other device stopped sending for a long time: hang up, as for a lost connection.
    if (this.rollback.stalled > STALL_LIMIT_FRAMES && this.state.phase !== 'over') room?.dropAll();
    return events;
  }

  /** The match ends in a draw (someone left). */
  stopAsDraw() {
    this.ended = true;
    endInDraw(this.rollback.state);
  }
}

// ---------------------------------------------------------------- joining and leaving

export async function createFighterRoom() {
  leaveFighterRoom();
  fighterRoom.set({ ...blank, status: 'connecting', role: 'host', mySeat: 0 });
  try {
    const r = await Room.host('fighter', PLAYERS - 1, {
      onJoin: () => {
        hostUpdate((l) => {
          l.seats[1] = emptySeat(true);
          // A newcomer always starts at character select.
          toCharacterSelect(l);
        });
        patch({ notice: null });
      },
      onLeave: (_id, reason) => opponentGone(reason),
      onMessage: (_id, msg) => hostMessage(msg),
    });
    if (fighterRoom.get().status !== 'connecting') return r.close();
    room = r;
    patch({ status: 'open', code: r.code });
  } catch (e) {
    patch({ status: 'error', error: e instanceof RoomError ? e.message : 'Could not create a room.' });
  }
}

export async function joinFighterRoom(code: string) {
  leaveFighterRoom();
  fighterRoom.set({ ...blank, status: 'connecting', role: 'guest', code, mySeat: 1 });
  try {
    const r = await Room.join('fighter', code, {
      onLeave: (_id, reason) => opponentGone(reason),
      onMessage: (_id, msg) => guestMessage(msg),
    });
    if (fighterRoom.get().status !== 'connecting') return r.close();
    room = r;
    patch({ status: 'open' });
  } catch (e) {
    patch({ status: 'error', error: e instanceof RoomError ? e.message : 'Could not join the room.' });
  }
}

export function leaveFighterRoom() {
  clearTimers();
  early = [];
  fighterRoom.get().driver?.stopAsDraw();
  room?.close();
  room = null;
  fighterRoom.set({ ...blank });
}

export function clearFighterNotice() {
  if (fighterRoom.get().notice) patch({ notice: null });
}

function opponentGone(reason: 'left' | 'lost') {
  const s = fighterRoom.get();
  const midMatch = s.lobby.phase === 'match' && s.driver && s.driver.state.phase !== 'over';
  if (midMatch) {
    // Spec: leaving or losing connection mid-match is a draw.
    s.driver!.stopAsDraw();
    if (s.role === 'host')
      hostUpdate((l) => {
        l.seats[1] = emptySeat(false);
      });
    else {
      room?.close();
      room = null;
    }
    patch({ disconnected: true });
    return;
  }
  if (s.role === 'host') {
    clearTimers();
    hostUpdate((l) => {
      l.seats[1] = emptySeat(false);
      toCharacterSelect(l);
    });
    patch({ driver: null, disconnected: false, notice: reason === 'left' ? 'Your opponent left the room.' : 'Your opponent lost connection.' });
  } else {
    room?.close();
    room = null;
    patch({ status: 'closed', notice: reason === 'left' ? 'The room was closed.' : 'Lost connection to the room.' });
  }
}

/** After a draw by disconnection: back to the room (creator) or out (joiner). */
export function afterDisconnect() {
  const s = fighterRoom.get();
  if (s.role === 'host') {
    clearTimers();
    hostUpdate((l) => toCharacterSelect(l));
    patch({ driver: null, disconnected: false });
  } else leaveFighterRoom();
}

// ---------------------------------------------------------------- what this player does

export function pickFighter(pick: Pick) {
  send({ t: 'pick', pick });
}
export function setFighterReady(ready: boolean) {
  send({ t: 'ready', ready });
}
export function voteStage(vote: Vote) {
  send({ t: 'vote', vote });
}
/** The room creator sets the rules at character select; the other player has to press Ready again. */
export function setRules(rules: MatchRules) {
  const s = fighterRoom.get();
  if (s.role !== 'host' || s.lobby.phase !== 'chars') return;
  hostUpdate((l) => {
    l.rules = rules;
    l.seats[1].ready = false;
  });
}

/** The creator applies its own actions directly; the joiner sends them to the creator. */
function send(msg: RoomMessage) {
  const s = fighterRoom.get();
  if (s.role === 'host') applyAction(0, msg);
  else room?.broadcast(msg);
}

// ---------------------------------------------------------------- the creator runs the lobby

function hostUpdate(change: (l: Lobby) => void) {
  const l = structuredClone(fighterRoom.get().lobby);
  change(l);
  setLobby(l);
  room?.broadcast({ t: 'lobby', lobby: l });
}

function hostMessage(msg: RoomMessage) {
  if (msg.t === 'rb') return matchMessage(msg.m as RollbackMessage);
  applyAction(1, msg);
}

function matchMessage(m: RollbackMessage) {
  const d = fighterRoom.get().driver;
  if (d && d.config.match === m.m) d.rollback.receive(m);
  else if (!d || m.m > d.config.match) early.push(m);
}

function applyAction(seat: number, msg: RoomMessage) {
  const l = fighterRoom.get().lobby;
  if (msg.t === 'pick' && l.phase === 'chars' && !l.seats[seat].ready) {
    const pick = msg.pick as Pick;
    if (pick !== 'random' && !CHAR_IDS.includes(pick)) return;
    hostUpdate((x) => {
      x.seats[seat].pick = pick;
    });
  } else if (msg.t === 'ready' && l.phase === 'chars') {
    if (msg.ready && !l.seats[seat].pick) return;
    hostUpdate((x) => {
      x.seats[seat].ready = msg.ready === true;
    });
    maybeStageSelect();
  } else if (msg.t === 'vote' && l.phase === 'stages') {
    const vote = msg.vote as Vote;
    if (vote !== 'random' && !STAGE_IDS.includes(vote)) return;
    hostUpdate((x) => {
      x.seats[seat].vote = vote;
    });
    maybeReveal();
  }
}

/** Both ready: settle Random picks, then stage select. */
function maybeStageSelect() {
  const l = fighterRoom.get().lobby;
  if (!l.seats.every((s) => s.here && s.ready && s.pick)) return;
  hostUpdate((x) => {
    for (const s of x.seats) s.char = s.pick === 'random' ? CHAR_IDS[randomInt(hostRng, CHAR_IDS.length)] : (s.pick as CharId);
    for (const s of x.seats) s.vote = null;
    x.votedStages = [null, null];
    x.stage = null;
    x.set = freshSet();
    x.last = null;
    x.phase = 'stages';
  });
}

/**
 * Both voted (spec): a Random vote is a vote for a random stage from the whole
 * list; the same pick plays that stage; different picks play one of the two at random.
 */
function maybeReveal() {
  const l = fighterRoom.get().lobby;
  if (!l.seats.every((s) => s.vote)) return;
  hostUpdate((x) => {
    x.votedStages = x.seats.map((s) => (s.vote === 'random' ? STAGE_IDS[randomInt(hostRng, STAGE_IDS.length)] : (s.vote as StageId)));
    const [a, b] = x.votedStages as StageId[];
    x.stage = a === b ? a : randomInt(hostRng, 2) === 0 ? a : b;
    x.phase = 'reveal';
  });
  later(REVEAL_MS, () =>
    hostUpdate((x) => {
      x.phase = 'match';
      x.match++;
      x.seed = newSeed();
    }),
  );
}

/**
 * The creator's game finished. One game, or the set won: after the result,
 * everyone goes back to character select. A set still going: after the score,
 * the next game starts with the same fighters and stage.
 */
export function matchFinished(winner: number | null) {
  const s = fighterRoom.get();
  if (s.role !== 'host') return;
  const l = s.lobby;
  const scored = scoreGame(l.rules, l.set, winner);
  const done = l.rules.bestOf === 1 || scored.setWinner >= 0;
  hostUpdate((x) => {
    x.set = scored.set;
    x.last = { match: x.match, wins: scored.set.wins, setWinner: scored.setWinner, done };
  });
  if (done) later(BACK_TO_SELECT_MS, () => hostUpdate((x) => toCharacterSelect(x)));
  else
    later(NEXT_GAME_MS, () =>
      hostUpdate((x) => {
        x.match++;
        x.seed = newSeed();
      }),
    );
}

// ---------------------------------------------------------------- both devices

function guestMessage(msg: RoomMessage) {
  if (msg.t === 'rb') return matchMessage(msg.m as RollbackMessage);
  if (msg.t === 'lobby') setLobby(msg.lobby as Lobby);
}

/** Applies a new lobby; starts a match when one begins. */
function setLobby(l: Lobby) {
  const s = fighterRoom.get();
  let driver = s.driver;
  if (l.phase === 'match' && (!driver || driver.config.match !== l.match)) {
    const config: OnlineMatchConfig = { stage: l.stage!, chars: l.seats.map((x) => x.char!), seed: l.seed, match: l.match, rules: l.rules };
    driver = new OnlineDriver(config, s.mySeat, (m) => sendRollback(m));
    const mine = early.filter((m) => m.m === l.match);
    early = early.filter((m) => m.m > l.match);
    for (const m of mine) driver.rollback.receive(m);
  }
  if (l.phase !== 'match') driver = null;
  patch({ lobby: l, driver, disconnected: l.phase === 'match' ? s.disconnected : false });
}

/** Development only: delay match messages to test rollback on a fast local connection. */
function sendRollback(m: RollbackMessage) {
  const delay = import.meta.env.DEV ? Number((window as unknown as { __netDelay?: number }).__netDelay ?? 0) : 0;
  if (delay > 0) {
    const jitter = Number((window as unknown as { __netJitter?: number }).__netJitter ?? 0);
    window.setTimeout(() => room?.broadcast({ t: 'rb', m }), delay + Math.random() * jitter);
  } else room?.broadcast({ t: 'rb', m });
}
