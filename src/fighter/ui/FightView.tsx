import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogOut, RotateCw } from 'lucide-react';
import { confirmDialog } from '../../components/dialogs';
import { Button } from '../../components/ui';
import { sfx } from '../../lib/audio/sfx';
import { useMusic } from '../../lib/audio/useMusic';
import { useLandscape } from '../../lib/useOrientation';
import { Keyboard } from '../input/keyboard';
import { TouchControls, TouchInput } from '../input/TouchControls';
import { Scene, type PlayerLabel } from '../render/scene';
import { FPS } from '../sim/step';
import type { MatchState, SimEvent } from '../sim/types';

/** True on phones and tablets: show the on-screen controls. */
export const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/** How long the "GAME!" call stays up before the result shows. */
const GAME_CALL_FRAMES = 110;

export interface FightDriver {
  state: MatchState;
  /** Advances one frame with this device's buttons. */
  tick(local: number): SimEvent[];
}

/**
 * The match screen: runs the simulation at a fixed 60 steps per second
 * (whatever the screen's refresh rate), reads this device's controls, draws,
 * and plays sounds. Calls onOver once the match has ended.
 */
export function FightView({
  driver,
  labels,
  mySlot,
  onLeave,
  onOver,
  overlay,
}: {
  driver: FightDriver;
  labels: PlayerLabel[];
  mySlot: number;
  onLeave: () => void;
  onOver: (s: MatchState) => void;
  overlay?: ReactNode;
}) {
  useMusic('fighter');
  const canvas = useRef<HTMLCanvasElement>(null);
  const landscape = useLandscape();
  const paused = isTouch && !landscape;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const [touch] = useState(() => new TouchInput());
  const onOverRef = useRef(onOver);
  onOverRef.current = onOver;

  useEffect(() => {
    const el = canvas.current!;
    const scene = new Scene(el, labels);
    // Development only: lets automated tests read the running match.
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__fight = driver;
    const keys = new Keyboard();
    keys.attach();
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let reported = false;
    const dt = 1000 / FPS;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // Long gaps (app in the background) do not fast-forward the match.
      acc += Math.min(now - last, 100);
      last = now;
      if (pausedRef.current) acc = 0;
      while (acc >= dt) {
        acc -= dt;
        const events = driver.tick(keys.read() | touch.read());
        scene.onEvents(driver.state, events);
        playSounds(events, mySlot);
      }
      scene.draw(driver.state);
      const s = driver.state;
      if (!reported && s.phase === 'over' && s.phaseT >= GAME_CALL_FRAMES) {
        reported = true;
        onOverRef.current(s);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      keys.detach();
    };
    // The driver is fixed for the life of this screen.
  }, [driver, labels, mySlot, touch]);

  // Escape asks to leave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void askLeave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const askLeave = async () => {
    if (driver.state.phase !== 'over' && !(await confirmDialog({ title: 'Leave the match?', body: 'The match ends here.', confirm: 'Leave match' }))) return;
    onLeave();
  };

  return (
    <div className="game-surface relative h-full w-full overflow-hidden bg-[#f6e7cf]" style={{ touchAction: 'none' }}>
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      <Button size="xs" variant="ghost" className="absolute left-2 top-2 z-30 bg-surface/70" onClick={() => void askLeave()}>
        <LogOut className="size-3.5" />
        Leave
      </Button>
      {isTouch && <TouchControls input={touch} />}
      {overlay}
      {paused && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-bg/95 p-6 text-center">
          <RotateCw className="size-12 animate-spin text-accent [animation-duration:3s]" />
          <h2 className="text-3xl">Turn your phone sideways</h2>
          <p className="max-w-xs text-muted">The Platfighter plays in landscape. The match is paused until you turn your phone.</p>
        </div>
      )}
    </div>
  );
}

function playSounds(events: SimEvent[], mySlot: number) {
  for (const e of events) {
    switch (e.type) {
      case 'hit':
        sfx.hit(Math.min(1, e.kb / 140));
        break;
      case 'swing':
        sfx.whiff(e.heavy);
        break;
      case 'jump':
        sfx.jump(e.double);
        break;
      case 'land':
        if (e.slot === mySlot) sfx.land();
        break;
      case 'dodge':
        sfx.dodge();
        break;
      case 'ko':
        sfx.ko();
        break;
      case 'shoot':
        sfx.shoot(e.kind);
        break;
      case 'reflect':
        sfx.reflect();
        break;
      case 'armor':
        sfx.armor();
        break;
      case 'shatter':
        sfx.shatter();
        break;
      case 'teleport':
        sfx.teleport();
        break;
      case 'ledge':
        sfx.ledge();
        break;
      case 'count':
        sfx.count(e.n);
        break;
      case 'go':
        sfx.count(0);
        break;
      case 'tick':
        sfx.tick();
        break;
      case 'game':
        sfx.game();
        break;
      case 'sudden':
        sfx.sudden();
        break;
    }
  }
}
