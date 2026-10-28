// Rollback netcode, independent of the game.
//
// Every device runs the whole match. Each frame, this device sends its own
// buttons to the others, a few frames ahead of when they are used (input
// delay). When another player's buttons for a frame have not arrived yet,
// the match goes on with a guess (they kept pressing what they pressed last).
// When the real buttons arrive and the guess was wrong, the match is rewound
// to that frame and replayed with the right buttons, which is why the game
// state has to be copyable and the simulation exact on every device.
//
// The devices also compare checksums of the match now and then. If they ever
// differ, the room creator's copy is sent and the other device continues from it.

export interface RollbackGame<S, E> {
  step(state: S, inputs: number[]): E[];
  clone(state: S): S;
}

export type RollbackMessage =
  /** Buttons of player `p` for frame `f`, and the sender's prediction window (for time sync). */
  | { t: 'in'; m: number; p: number; f: number; b: number; a: number }
  /** Checksum of the match after `f` frames. */
  | { t: 'sum'; m: number; f: number; h: number }
  /** The room creator's copy of the match after `f` frames, to recover from a mismatch. */
  | { t: 'sync'; m: number; f: number; s: unknown };

export interface RollbackOptions<S> {
  players: number;
  local: number;
  /** Frames between pressing a button and it being used. */
  inputDelay: number;
  /** The most frames this device may run ahead of the slowest player's known buttons. */
  maxPredict: number;
  /** Match id, so messages from an earlier match are ignored. */
  match: number;
  /** This device resends its state when checksums disagree. */
  authority: boolean;
  send(msg: RollbackMessage): void;
  /** Called with the state from the authority after a mismatch, before it is used. */
  onDesync?(frame: number): void;
  hash(state: S): number;
}

const CHECK_EVERY = 60;

export class Rollback<S, E> {
  /** Frames simulated so far. `state` is the match after this many frames. */
  frame = 0;
  state: S;
  /** Frames rewound and replayed (for testing and the debug readout). */
  rollbacks = 0;
  /** Frames in a row where this device had to wait for the others. */
  stalled = 0;
  desyncs = 0;

  /** inputs[f][p]: buttons used (or confirmed) for frame f. */
  private inputs: number[][] = [];
  private known: boolean[][] = [];
  /** Highest frame for which all of player p's buttons up to it are known. */
  private confirmed: number[];
  private snapshots = new Map<number, S>();
  private rewindTo = Infinity;
  private remoteAhead: number[];
  private sums = new Map<number, number>();
  private remoteSums = new Map<number, number>();
  private tickCount = 0;

  constructor(
    private game: RollbackGame<S, E>,
    initial: S,
    private o: RollbackOptions<S>,
  ) {
    this.state = game.clone(initial);
    this.snapshots.set(0, game.clone(initial));
    this.confirmed = Array.from({ length: o.players }, () => o.inputDelay - 1);
    this.remoteAhead = Array.from({ length: o.players }, () => 0);
    // Nobody presses anything during the first `inputDelay` frames.
    for (let f = 0; f < o.inputDelay; f++) {
      this.inputs[f] = Array.from({ length: o.players }, () => 0);
      this.known[f] = Array.from({ length: o.players }, () => true);
    }
  }

  /** How many frames ahead of the slowest player's known buttons this device is. */
  get ahead() {
    let lowest = Infinity;
    for (let p = 0; p < this.o.players; p++) if (p !== this.o.local) lowest = Math.min(lowest, this.confirmed[p]);
    return this.frame - (lowest + 1);
  }

  /** Lowest frame whose buttons are known for everyone. */
  get confirmedFrame() {
    return Math.min(...this.confirmed);
  }

  /** Buttons from another player arrived. */
  receive(msg: RollbackMessage) {
    if (msg.m !== this.o.match) return;
    if (msg.t === 'in') {
      this.remoteAhead[msg.p] = msg.a;
      this.setInput(msg.p, msg.f, msg.b);
    } else if (msg.t === 'sum') {
      this.remoteSums.set(msg.f, msg.h);
      this.compareSums(msg.f);
    } else if (msg.t === 'sync' && !this.o.authority) {
      // Continue from the authority's copy at that frame, then replay to now.
      const s = msg.s as S;
      this.snapshots.set(msg.f, this.game.clone(s));
      this.sums.delete(msg.f);
      this.rewindTo = Math.min(this.rewindTo, msg.f);
      this.desyncs++;
      this.o.onDesync?.(msg.f);
    }
  }

  private setInput(p: number, f: number, b: number) {
    if (!this.inputs[f]) {
      this.inputs[f] = [];
      this.known[f] = [];
    }
    if (this.known[f][p]) return;
    const used = this.inputs[f][p];
    this.inputs[f][p] = b;
    this.known[f][p] = true;
    // Already simulated with a guess that turned out wrong: rewind to it.
    if (f < this.frame && used !== b) this.rewindTo = Math.min(this.rewindTo, f);
    while (this.known[this.confirmed[p] + 1]?.[p]) this.confirmed[p]++;
  }

  /** The buttons used for player p on frame f: known, or the latest known ones repeated. */
  private inputFor(f: number, p: number): number {
    if (this.known[f]?.[p]) return this.inputs[f][p];
    const last = this.confirmed[p];
    return last >= 0 ? (this.inputs[last]?.[p] ?? 0) : 0;
  }

  private simulate(): E[] {
    const f = this.frame;
    const row: number[] = [];
    for (let p = 0; p < this.o.players; p++) row.push(this.inputFor(f, p));
    if (!this.inputs[f]) {
      this.inputs[f] = [];
      this.known[f] = [];
    }
    for (let p = 0; p < this.o.players; p++) if (!this.known[f][p]) this.inputs[f][p] = row[p];
    const events = this.game.step(this.state, row);
    this.frame++;
    this.snapshots.set(this.frame, this.game.clone(this.state));
    return events;
  }

  /**
   * One tick (1/60 s): sends this device's buttons, replays if a guess was
   * wrong, and moves the match on (usually one frame; none while waiting for
   * the others; skipping one now and then to stay in step with them).
   * Returns the events of frames shown for the first time.
   */
  tick(local: number): E[] {
    this.tickCount++;
    // Replay from the earliest wrong guess.
    if (this.rewindTo < this.frame) {
      const to = this.frame;
      const snap = this.snapshots.get(this.rewindTo);
      if (snap) {
        this.state = this.game.clone(snap);
        this.frame = this.rewindTo;
        while (this.frame < to) this.simulate();
        this.rollbacks++;
      }
    }
    this.rewindTo = Infinity;

    // Stay in step: if this device is clearly ahead of the others, skip a frame now and then.
    let frames = 1;
    const mine = this.ahead;
    const theirs = Math.max(...this.remoteAhead.filter((_, p) => p !== this.o.local));
    if (mine - theirs >= 2 && this.tickCount % 6 === 0) frames = 0;
    // Never run further ahead than the prediction window.
    if (mine >= this.o.maxPredict) frames = 0;
    this.stalled = frames === 0 && mine >= this.o.maxPredict ? this.stalled + 1 : 0;

    const events: E[] = [];
    for (let i = 0; i < frames; i++) {
      // This device's buttons are used `inputDelay` frames from now.
      const target = this.frame + this.o.inputDelay;
      if (!this.known[target]?.[this.o.local]) {
        this.setInput(this.o.local, target, local);
        this.o.send({ t: 'in', m: this.o.match, p: this.o.local, f: target, b: local, a: this.ahead });
      }
      events.push(...this.simulate());
    }
    this.checksums();
    this.prune();
    return events;
  }

  /** Compares the match with the other devices on frames everyone has confirmed. */
  private checksums() {
    const done = this.confirmedFrame + 1;
    const f = Math.floor(done / CHECK_EVERY) * CHECK_EVERY;
    if (f <= 0 || f > this.frame || this.sums.has(f)) return;
    const snap = this.snapshots.get(f);
    if (!snap) return;
    const h = this.o.hash(snap);
    this.sums.set(f, h);
    this.o.send({ t: 'sum', m: this.o.match, f, h });
    this.compareSums(f);
  }

  private compareSums(f: number) {
    const mine = this.sums.get(f);
    const theirs = this.remoteSums.get(f);
    if (mine === undefined || theirs === undefined) return;
    this.remoteSums.delete(f);
    if (mine === theirs) return;
    if (this.o.authority) {
      const snap = this.snapshots.get(f);
      if (snap) this.o.send({ t: 'sync', m: this.o.match, f, s: snap });
      this.desyncs++;
    }
  }

  /** Forgets snapshots and buttons nobody can rewind to anymore. */
  private prune() {
    const keep = Math.min(this.confirmedFrame, this.frame) - CHECK_EVERY * 2;
    for (const k of this.snapshots.keys()) if (k < keep && k % CHECK_EVERY !== 0) this.snapshots.delete(k);
    for (const k of this.snapshots.keys()) if (k < keep - CHECK_EVERY * 4) this.snapshots.delete(k);
    for (const k of this.sums.keys()) if (k < keep - CHECK_EVERY * 4) this.sums.delete(k);
  }
}

/** A quick checksum of any plain data (FNV-1a over its JSON). */
export function hashState(state: unknown): number {
  const s = JSON.stringify(state);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
