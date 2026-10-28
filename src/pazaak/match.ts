import { cpuTurn } from './cpu';
import { apply, type PazaakAction, type PazaakState, type Seat } from './rules';

/** The turn timer from the spec. When it runs out the turn ends; the player does not stand. */
export const TURN_MS = 5000;
/** How long the result of a set stays on the table before the next set starts. */
export const SET_PAUSE_MS = 2600;
/** The CPU thinks for a moment so its moves can be followed. */
const CPU_THINK_MS = 900;
const CPU_STEP_MS = 650;

/**
 * Runs a match on this device: applies actions, keeps the turn timer, plays
 * the CPU's turns and starts the next set after a pause. Used for CPU games
 * and by the room creator in online games.
 */
export class LocalMatch {
  private timers: number[] = [];
  private timedTurn = -1;
  private stopped = false;
  /** performance.now() time when the current turn runs out, or null between turns. */
  deadline: number | null = null;

  constructor(
    public state: PazaakState,
    private readonly onChange: (m: LocalMatch) => void,
    private readonly cpuSeat: Seat | null = null,
  ) {
    this.schedule();
  }

  act(action: PazaakAction): boolean {
    if (this.stopped) return false;
    const next = apply(this.state, action);
    if (next === this.state) return false;
    this.state = next;
    this.schedule();
    this.onChange(this);
    return true;
  }

  /** Time left in the current turn, in ms. */
  msLeft() {
    return this.deadline === null ? null : Math.max(0, this.deadline - performance.now());
  }

  stop() {
    this.stopped = true;
    this.clear();
  }

  private clear() {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }

  private later(ms: number, fn: () => void) {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private schedule() {
    const s = this.state;
    if (s.phase === 'setOver') {
      this.clear();
      this.deadline = null;
      this.timedTurn = -1;
      this.later(SET_PAUSE_MS, () => this.act({ type: 'nextSet' }));
      return;
    }
    if (s.phase === 'matchOver') {
      this.clear();
      this.deadline = null;
      return;
    }
    // Playing a hand card does not restart the clock; only a new turn does.
    if (s.turnId === this.timedTurn) return;
    this.clear();
    this.timedTurn = s.turnId;
    this.deadline = performance.now() + TURN_MS;
    const { turn, turnId } = s;
    this.later(TURN_MS, () => this.act({ type: 'timeout', seat: turn, turnId }));
    if (turn === this.cpuSeat) {
      const steps = cpuTurn(s, turn);
      steps.forEach((a, i) => this.later(CPU_THINK_MS + i * CPU_STEP_MS, () => this.state.turnId === turnId && this.act(a)));
    }
  }
}
