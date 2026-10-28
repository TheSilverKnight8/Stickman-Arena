import { BTN } from '../sim/types';

// Keyboard controls (one player per device). Two layouts work at the same time:
//   Left hand on WASD:   J attack · K special · L or Space jump · ; or Shift dodge
//   Right hand on arrows: Z attack · X special · C or Space jump · V dodge

export const KEY_LAYOUT: { keys: string[]; action: string }[] = [
  { keys: ['W A S D', '← ↑ → ↓'], action: 'Move and aim' },
  { keys: ['J', 'Z'], action: 'Attack' },
  { keys: ['K', 'X'], action: 'Special' },
  { keys: ['L', 'C', 'Space'], action: 'Jump' },
  { keys: [';', 'V', 'Shift'], action: 'Dodge' },
];

const MAP: Record<string, number> = {
  KeyA: BTN.left,
  ArrowLeft: BTN.left,
  KeyD: BTN.right,
  ArrowRight: BTN.right,
  KeyW: BTN.up,
  ArrowUp: BTN.up,
  KeyS: BTN.down,
  ArrowDown: BTN.down,
  KeyJ: BTN.attack,
  KeyZ: BTN.attack,
  KeyK: BTN.special,
  KeyX: BTN.special,
  KeyL: BTN.jump,
  KeyC: BTN.jump,
  Space: BTN.jump,
  Semicolon: BTN.dodge,
  KeyV: BTN.dodge,
  ShiftLeft: BTN.dodge,
  ShiftRight: BTN.dodge,
};

export class Keyboard {
  private down = new Set<string>();
  /** Buttons pressed and released between two frames still count for one frame. */
  private tapped = 0;
  /** A press that would merge with the same button held last frame waits one frame, so it still counts as a new press. */
  private later = 0;
  private last = 0;

  private onDown = (e: KeyboardEvent) => {
    const b = MAP[e.code];
    if (b === undefined || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    if (!e.repeat) {
      this.down.add(e.code);
      this.tapped |= b;
    }
  };
  private onUp = (e: KeyboardEvent) => {
    if (MAP[e.code] === undefined) return;
    this.down.delete(e.code);
  };
  private onBlur = () => this.down.clear();

  attach() {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
    this.down.clear();
  }

  /** The buttons for this frame. */
  read(): number {
    let held = 0;
    for (const code of this.down) held |= MAP[code];
    let bits = held | this.tapped | this.later;
    // Tapped again (another key for the same action) while it was down last frame: let it go for a frame first.
    const merged = this.tapped & this.last & ~held;
    bits &= ~merged;
    this.later = merged;
    this.tapped = 0;
    this.last = bits;
    return bits;
  }
}
