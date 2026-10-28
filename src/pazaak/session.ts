import { newSeed } from '../lib/rng';
import { createStore } from '../lib/store';
import { Room, RoomError, type RoomMessage } from '../net/room';
import { deckProblem } from './cards';
import { cpuDeck, type CpuLevel } from './cpu';
import { LocalMatch } from './match';
import { newMatch, viewFor, type PazaakAction, type PazaakState, type Seat } from './rules';

// What the Pazaak screens show, for a CPU game and for an online room. Kept
// outside React so a match keeps running while screens re-render.

export interface TableView {
  /** The match as this player may see it. */
  state: PazaakState;
  mySeat: Seat;
  /** performance.now() time the current turn runs out. */
  deadline: number | null;
  opponentName: string;
  /** The opponent left or lost connection mid-match: the match is a draw. */
  disconnected: boolean;
}

const MATCH_END_PAUSE_MS = 5000;

/** The side deck being built. Shared by CPU games and rooms; kept only until the app closes. */
export const myDeck = createStore<string[]>([]);

// ---------------------------------------------------------------- CPU games

export interface CpuGame {
  level: CpuLevel;
  table: TableView | null;
}

export const cpuGame = createStore<CpuGame>({ level: 'normal', table: null });
let cpuMatch: LocalMatch | null = null;

export function startCpuMatch() {
  const { level } = cpuGame.get();
  const deck = myDeck.get();
  if (deckProblem(deck)) return;
  cpuMatch?.stop();
  const state = newMatch(newSeed(), [deck, cpuDeck(level)]);
  cpuMatch = new LocalMatch(state, (m) => showCpu(m), 1);
  showCpu(cpuMatch);
}

function showCpu(m: LocalMatch) {
  cpuGame.set((g) => ({ ...g, table: { state: viewFor(m.state, 0), mySeat: 0, deadline: m.deadline, opponentName: 'CPU', disconnected: false } }));
}

export function cpuAct(action: PazaakAction) {
  cpuMatch?.act({ ...action, seat: 0 } as PazaakAction);
}

/** Leaves the table and goes back to deck selection. */
export function endCpuMatch() {
  cpuMatch?.stop();
  cpuMatch = null;
  cpuGame.set((g) => ({ ...g, table: null }));
}

// ---------------------------------------------------------------- online rooms

export interface RoomState {
  status: 'connecting' | 'open' | 'closed' | 'error';
  role: 'host' | 'guest';
  code: string;
  error: string | null;
  /** Shown once, then cleared (for example "Your opponent left the room"). */
  notice: string | null;
  phase: 'lobby' | 'match';
  ready: boolean;
  opponentHere: boolean;
  opponentReady: boolean;
  table: TableView | null;
}

const blankRoom: RoomState = {
  status: 'connecting',
  role: 'host',
  code: '',
  error: null,
  notice: null,
  phase: 'lobby',
  ready: false,
  opponentHere: false,
  opponentReady: false,
  table: null,
};

export const pazaakRoom = createStore<RoomState>({ ...blankRoom, status: 'closed' });

let room: Room | null = null;
let hostMatch: LocalMatch | null = null;
let guestDeck: string[] = [];
let backToLobby: number | undefined;

const patch = (p: Partial<RoomState>) => pazaakRoom.set((s) => ({ ...s, ...p }));

export async function createRoom() {
  leaveRoom();
  pazaakRoom.set({ ...blankRoom, role: 'host' });
  try {
    const r = await Room.host('pazaak', 1, {
      onJoin: () => {
        patch({ opponentHere: true, opponentReady: false, notice: null });
        sendLobby();
      },
      onLeave: (_id, reason) => opponentGone(reason),
      onMessage: (_id, msg) => hostMessage(msg),
    });
    if (pazaakRoom.get().status !== 'connecting') return r.close();
    room = r;
    patch({ status: 'open', code: r.code });
  } catch (e) {
    patch({ status: 'error', error: e instanceof RoomError ? e.message : 'Could not create a room.' });
  }
}

export async function joinRoom(code: string) {
  leaveRoom();
  pazaakRoom.set({ ...blankRoom, role: 'guest', code, opponentHere: true });
  try {
    const r = await Room.join('pazaak', code, {
      onLeave: (_id, reason) => opponentGone(reason),
      onMessage: (_id, msg) => guestMessage(msg),
    });
    if (pazaakRoom.get().status !== 'connecting') return r.close();
    room = r;
    patch({ status: 'open' });
  } catch (e) {
    patch({ status: 'error', error: e instanceof RoomError ? e.message : 'Could not join the room.' });
  }
}

export function leaveRoom() {
  window.clearTimeout(backToLobby);
  hostMatch?.stop();
  hostMatch = null;
  room?.close();
  room = null;
  pazaakRoom.set({ ...blankRoom, status: 'closed' });
}

/** Ready locks the deck in. A match starts when both players are ready. */
export function setReady(ready: boolean) {
  const s = pazaakRoom.get();
  if (ready && deckProblem(myDeck.get())) return;
  patch({ ready });
  if (s.role === 'host') {
    sendLobby();
    maybeStart();
  } else room?.broadcast({ t: 'ready', ready, deck: myDeck.get() });
}

export function roomAct(action: PazaakAction) {
  const s = pazaakRoom.get();
  if (s.phase !== 'match') return;
  if (s.role === 'host') hostMatch?.act({ ...action, seat: 0 } as PazaakAction);
  else room?.broadcast({ t: 'act', action: { ...action, seat: 1 } });
}

export function clearNotice() {
  if (pazaakRoom.get().notice) patch({ notice: null });
}

/** After a draw by disconnection, back to the room (creator) or out (joiner). */
export function dismissDisconnect() {
  const s = pazaakRoom.get();
  if (s.role === 'host') patch({ phase: 'lobby', table: null, ready: false });
  else leaveRoom();
}

function opponentGone(reason: 'left' | 'lost') {
  const s = pazaakRoom.get();
  window.clearTimeout(backToLobby);
  const midMatch = s.phase === 'match' && s.table && s.table.state.phase !== 'matchOver';
  hostMatch?.stop();
  hostMatch = null;
  if (midMatch) {
    patch({ opponentHere: false, opponentReady: false, table: { ...s.table!, deadline: null, disconnected: true } });
    if (s.role === 'guest') {
      room?.close();
      room = null;
    }
    return;
  }
  if (s.role === 'host') {
    patch({ opponentHere: false, opponentReady: false, phase: 'lobby', table: null, notice: reason === 'left' ? 'Your opponent left the room.' : 'Your opponent lost connection.' });
  } else {
    room?.close();
    room = null;
    patch({ status: 'closed', notice: reason === 'left' ? 'The room was closed.' : 'Lost connection to the room.' });
  }
}

// Host side ------------------------------------------------------------------

function sendLobby() {
  room?.broadcast({ t: 'lobby', ready: pazaakRoom.get().ready });
}

function hostMessage(msg: RoomMessage) {
  const s = pazaakRoom.get();
  if (msg.t === 'ready' && s.phase === 'lobby') {
    const ready = msg.ready === true && !deckProblem(msg.deck);
    if (ready) guestDeck = msg.deck as string[];
    patch({ opponentReady: ready });
    maybeStart();
  } else if (msg.t === 'act' && s.phase === 'match' && hostMatch) {
    const a = msg.action as PazaakAction;
    if (a && typeof a === 'object') hostMatch.act({ ...a, seat: 1 } as PazaakAction);
  }
}

function maybeStart() {
  const s = pazaakRoom.get();
  if (s.role !== 'host' || s.phase !== 'lobby' || !s.ready || !s.opponentReady || !s.opponentHere) return;
  hostMatch?.stop();
  hostMatch = new LocalMatch(newMatch(newSeed(), [myDeck.get(), guestDeck]), hostChanged);
  patch({ phase: 'match' });
  hostChanged(hostMatch);
}

function hostChanged(m: LocalMatch) {
  const s = m.state;
  room?.broadcast({ t: 'state', state: viewFor(s, 1), msLeft: m.msLeft() });
  patch({ table: { state: viewFor(s, 0), mySeat: 0, deadline: m.deadline, opponentName: 'Opponent', disconnected: false } });
  if (s.phase === 'matchOver') {
    // The result stays up for a few seconds, then both players go back to deck selection (the rematch).
    window.clearTimeout(backToLobby);
    backToLobby = window.setTimeout(() => {
      hostMatch?.stop();
      hostMatch = null;
      patch({ phase: 'lobby', table: null, ready: false, opponentReady: false });
      room?.broadcast({ t: 'toLobby' });
    }, MATCH_END_PAUSE_MS);
  }
}

// Guest side -----------------------------------------------------------------

function guestMessage(msg: RoomMessage) {
  if (msg.t === 'lobby') patch({ opponentReady: msg.ready === true });
  else if (msg.t === 'state') {
    const state = msg.state as PazaakState;
    const msLeft = typeof msg.msLeft === 'number' ? msg.msLeft : null;
    patch({
      phase: 'match',
      table: { state, mySeat: 1, deadline: msLeft === null ? null : performance.now() + msLeft, opponentName: 'Opponent', disconnected: false },
    });
  } else if (msg.t === 'toLobby') patch({ phase: 'lobby', table: null, ready: false, opponentReady: false });
}

export const MATCH_END_SECONDS = MATCH_END_PAUSE_MS / 1000;
