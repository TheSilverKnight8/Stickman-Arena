import { useEffect, useRef, useState } from 'react';
import { cx } from '../../components/ui';
import { BTN } from '../sim/types';

// Phone controls (landscape): a joystick on the left half of the screen and
// four buttons on the right. The joystick appears where the thumb lands.

export class TouchInput {
  x = 0;
  y = 0;
  buttons = 0;
  private tapped = 0;

  press(b: number) {
    this.buttons |= b;
    this.tapped |= b;
  }
  release(b: number) {
    this.buttons &= ~b;
  }
  /** The buttons for this frame. */
  read(): number {
    let bits = this.buttons | this.tapped;
    this.tapped = 0;
    // Side if the stick is pushed a little that way; up/down only when the push is mostly vertical.
    if (this.x > 0.3) bits |= BTN.right;
    if (this.x < -0.3) bits |= BTN.left;
    const ay = Math.abs(this.y);
    if (ay > 0.45 && ay >= Math.abs(this.x) * 0.6) bits |= this.y > 0 ? BTN.up : BTN.down;
    return bits;
  }
  reset() {
    this.x = 0;
    this.y = 0;
    this.buttons = 0;
    this.tapped = 0;
  }
}

const RADIUS = 56;

export function TouchControls({ input }: { input: TouchInput }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none" style={{ touchAction: 'none' }}>
      <Stick input={input} />
      <div className="pointer-events-none absolute bottom-[max(14px,env(safe-area-inset-bottom))] right-[max(16px,env(safe-area-inset-right))] h-[188px] w-[188px]">
        <Pad input={input} bit={BTN.jump} label="Jump" className="left-1/2 top-0 -translate-x-1/2" />
        <Pad input={input} bit={BTN.attack} label="Attack" className="right-0 top-1/2 -translate-y-1/2" accent />
        <Pad input={input} bit={BTN.special} label="Special" className="left-0 top-1/2 -translate-y-1/2" accent />
        <Pad input={input} bit={BTN.dodge} label="Dodge" className="bottom-0 left-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}

function Stick({ input }: { input: TouchInput }) {
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointer = useRef<number | null>(null);

  useEffect(() => () => input.reset(), [input]);

  const move = (e: React.PointerEvent, b: { x: number; y: number }) => {
    let dx = e.clientX - b.x;
    let dy = e.clientY - b.y;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) {
      dx = (dx / d) * RADIUS;
      dy = (dy / d) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    input.x = dx / RADIUS;
    input.y = -dy / RADIUS;
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-0 left-0 top-0 w-[46%]"
      aria-label="Joystick"
      onPointerDown={(e) => {
        if (pointer.current !== null) return;
        pointer.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = e.currentTarget.getBoundingClientRect();
        const b = {
          x: Math.max(r.left + RADIUS + 12, Math.min(e.clientX, r.right - RADIUS - 12)),
          y: Math.max(r.top + RADIUS + 12, Math.min(e.clientY, r.bottom - RADIUS - 12)),
        };
        setBase(b);
        move(e, b);
      }}
      onPointerMove={(e) => {
        if (e.pointerId === pointer.current && base) move(e, base);
      }}
      onPointerUp={(e) => {
        if (e.pointerId !== pointer.current) return;
        pointer.current = null;
        setBase(null);
        setKnob({ x: 0, y: 0 });
        input.x = 0;
        input.y = 0;
      }}
      onPointerCancel={(e) => {
        if (e.pointerId !== pointer.current) return;
        pointer.current = null;
        setBase(null);
        input.x = 0;
        input.y = 0;
      }}
    >
      {base ? (
        <div className="fixed" style={{ left: base.x - RADIUS, top: base.y - RADIUS, width: RADIUS * 2, height: RADIUS * 2 }}>
          <div className="absolute inset-0 rounded-full border-[3px] border-navy/50 bg-surface/40" />
          <div
            className="absolute left-1/2 top-1/2 size-14 rounded-full border-[3px] border-navy bg-accent/85 shadow-pop"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          />
        </div>
      ) : (
        <div className="absolute bottom-[max(20px,env(safe-area-inset-bottom))] left-[max(24px,env(safe-area-inset-left))] flex size-28 items-center justify-center rounded-full border-[3px] border-dashed border-navy/30">
          <span className="font-display text-xs uppercase tracking-wide text-navy/45">Move</span>
        </div>
      )}
    </div>
  );
}

function Pad({ input, bit, label, className, accent = false }: { input: TouchInput; bit: number; label: string; className: string; accent?: boolean }) {
  const [down, setDown] = useState(false);
  const pointers = useRef(new Set<number>());
  const release = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) {
      setDown(false);
      input.release(bit);
    }
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(
        'pointer-events-auto absolute flex size-[66px] items-center justify-center rounded-full border-[3px] border-navy font-display text-[13px] uppercase tracking-wide shadow-pop ring-2 ring-cream transition-transform',
        down ? 'scale-95 bg-accent text-on-accent' : accent ? 'bg-navy/85 text-cream' : 'bg-surface/85 text-ink',
        className,
      )}
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.add(e.pointerId);
        setDown(true);
        input.press(bit);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}
