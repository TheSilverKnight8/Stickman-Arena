import { BTN } from '../sim/types';

// Tap jump (a setting): pressing up also jumps.
//
// The jump waits a few frames after up is pressed. If Attack or Special
// comes in that window, it is an up attack or up special instead, with no
// jump. Holding up keeps jump held (a full jump); a quick tap gives a short
// hop. It runs on this device before the buttons are used or sent online,
// so each player has their own setting and online matches stay in sync.

/** Frames between pressing up and the jump. */
export const TAP_JUMP_GRACE = 3;

export class TapJump {
  private prev = 0;
  private wait = 0;
  private jumping = false;

  /** This frame's buttons, with tap jump applied when it is on. */
  apply(raw: number, on: boolean): number {
    const press = raw & ~this.prev;
    this.prev = raw;
    if (!on || !(raw & BTN.up)) {
      this.wait = 0;
      this.jumping = false;
      return raw;
    }
    if (press & BTN.up) {
      this.wait = TAP_JUMP_GRACE;
      this.jumping = false;
    }
    // Up with Attack or Special is an up attack or up special, not a jump.
    if (raw & (BTN.attack | BTN.special) && !this.jumping) {
      this.wait = 0;
      return raw;
    }
    if (this.wait > 0 && --this.wait === 0) this.jumping = true;
    return this.jumping ? raw | BTN.jump : raw;
  }
}
