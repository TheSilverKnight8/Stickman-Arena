import { useEffect, useRef } from 'react';
import { CHARS } from '../sim/chars';
import { pose, solve } from '../sim/skeleton';
import type { CharId } from '../sim/types';
import { drawFigure } from '../render/figure';

/** A still drawing of a fighter in its stance, for the select screen. */
export function Portrait({ id, palette = 0, size = 96, className }: { id: CharId; palette?: number; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d')!;
    const c = CHARS[id];
    const j = solve(c.body, pose(c.anims.idle[0][1]), 0, 0, 1, true);
    // Fit the figure (and the sword) in the square.
    const xs = [j.head[0], j.tip[0], j.hand1[0], j.hand2[0], j.foot1[0], j.foot2[0]];
    const ys = [j.head[1] + c.body.head, j.tip[1], j.foot1[1], j.foot2[1], j.hand1[1]];
    const w = Math.max(...xs) - Math.min(...xs) + 40;
    const h = Math.max(...ys) - Math.min(...ys) + 30;
    const zoom = (size * dpr) / Math.max(w, h, 120);
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(zoom, 0, 0, -zoom, canvas.width / 2 - cx * zoom, canvas.height / 2 + cy * zoom);
    drawFigure(ctx, c, j, { color: palette ? c.alt : c.color, facing: 1 });
  }, [id, palette, size]);
  return <canvas ref={ref} className={className} style={{ width: size, height: size }} aria-hidden />;
}
