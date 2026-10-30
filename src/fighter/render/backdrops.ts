import type { StageId } from '../sim/types';

// The scenery behind each stage, in muted tints of the app's cream, navy and
// red, so the fighters (navy-outlined, in full colour) always stand out. Each
// layer sits at a depth: the further away, the smaller it is drawn and the
// less it moves when the camera does. Drawing only; nothing here touches the
// match.

type Ctx = CanvasRenderingContext2D;
interface Cam {
  x: number;
  y: number;
  zoom: number;
}

const ink = (a: number) => `rgba(0, 38, 87, ${a})`;
const ember = (a: number) => `rgba(252, 63, 63, ${a})`;
const paper = (a: number) => `rgba(250, 238, 218, ${a})`;

/** A steady pseudo-random number in 0..1 for an index (the same every frame). */
function rand(i: number) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Draws in layer units for a layer at depth `d` (1 moves with the stage; smaller is further and moves less). */
function layer(ctx: Ctx, W: number, H: number, cam: Cam, d: number) {
  const z = cam.zoom * (0.45 + 0.55 * d);
  ctx.setTransform(z, 0, 0, -z, W / 2 - cam.x * cam.zoom * d, H / 2 + cam.y * cam.zoom * d);
}

function sky(ctx: Ctx, W: number, H: number, top: string, bottom: string) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function poly(ctx: Ctx, pts: number[][], fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fill();
}

/** A soft cloud: a few overlapping blobs. */
function cloud(ctx: Ctx, x: number, y: number, s: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  for (const [dx, dy, r] of [
    [-1.1, 0, 0.55],
    [-0.4, 0.25, 0.75],
    [0.4, 0.15, 0.65],
    [1.1, 0, 0.5],
  ]) {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillRect(x - 1.6 * s, y - 0.35 * s, 3.2 * s, 0.4 * s);
}

/** Clouds drifting slowly across a wide strip, wrapping round. */
function clouds(ctx: Ctx, time: number, n: number, y0: number, y1: number, speed: number, fill: string, seed: number) {
  const span = 6400;
  for (let i = 0; i < n; i++) {
    const x = ((rand(seed + i) * span + time * speed) % span) - span / 2;
    cloud(ctx, x, y0 + rand(seed + i + 50) * (y1 - y0), 50 + rand(seed + i + 90) * 60, fill);
  }
}

/** Mountains or hills along a baseline: peaks every `step`, heights from `lo` to `hi`. */
function ridge(ctx: Ctx, base: number, step: number, lo: number, hi: number, fill: string, seed: number, snow?: string) {
  const pts: number[][] = [[-3400, base - 3000]];
  const peaks: number[][] = [];
  for (let x = -3400, i = 0; x <= 3400; x += step, i++) {
    const h = lo + rand(seed + i) * (hi - lo);
    pts.push([x, base + h]);
    peaks.push([x, base + h]);
    pts.push([x + step / 2, base + h * (0.35 + rand(seed + i + 40) * 0.3)]);
  }
  pts.push([3400, base - 3000]);
  poly(ctx, pts, fill);
  if (snow)
    for (const [x, y] of peaks) {
      if (y - base < (hi - lo) * 0.6 + lo) continue;
      poly(ctx, [[x, y], [x + step * 0.13, y - 34], [x + step * 0.04, y - 24], [x - step * 0.05, y - 38], [x - step * 0.13, y - 30]], snow);
    }
}

// ---------------------------------------------------------------- the stages

/** Flatline: an open plain at dusk under a low sun, mesas far off. */
function flatline(ctx: Ctx, W: number, H: number, cam: Cam, t: number) {
  sky(ctx, W, H, '#f1dcc0', '#f8eadb');
  layer(ctx, W, H, cam, 0.12);
  ctx.fillStyle = ember(0.09);
  ctx.beginPath();
  ctx.arc(420, 150, 230, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ember(0.08);
  ctx.beginPath();
  ctx.arc(420, 150, 150, 0, Math.PI * 2);
  ctx.fill();
  // Long thin clouds across the sun.
  for (let i = 0; i < 6; i++) {
    const y = 120 + i * 70 + rand(i) * 20;
    const x = ((rand(i + 10) * 5000 + t * 0.12) % 5000) - 2500;
    ctx.fillStyle = paper(0.6);
    ctx.beginPath();
    ctx.roundRect(x, y, 500 + rand(i + 20) * 600, 14, 7);
    ctx.fill();
  }
  layer(ctx, W, H, cam, 0.22);
  // Flat-topped mesas.
  const mesas: number[][] = [[-3400, -2000]];
  for (let x = -3400, i = 0; x < 3400; i++) {
    const w = 160 + rand(i + 30) * 260;
    const h = rand(i + 60) > 0.45 ? 40 + rand(i + 70) * 90 : 0;
    mesas.push([x, -40], [x + 40, -40 + h], [x + w - 40, -40 + h], [x + w, -40]);
    x += w + rand(i + 80) * 200;
  }
  mesas.push([3400, -40], [3400, -2000]);
  poly(ctx, mesas, ink(0.08));
  layer(ctx, W, H, cam, 0.45);
  ctx.fillStyle = ink(0.05);
  ctx.fillRect(-4000, -3000, 8000, 2960);
  ctx.strokeStyle = ink(0.06);
  ctx.lineWidth = 3;
  for (let i = 1; i < 7; i++) {
    const y = -40 - i * i * 14;
    ctx.beginPath();
    ctx.moveTo(-4000, y);
    ctx.lineTo(4000, y);
    ctx.stroke();
  }
}

/** Lookout: mountain ranges, a watchtower on a near peak with its flag flying. */
function lookout(ctx: Ctx, W: number, H: number, cam: Cam, t: number) {
  sky(ctx, W, H, '#ece2d2', '#f7ecda');
  layer(ctx, W, H, cam, 0.1);
  clouds(ctx, t, 9, 350, 750, 0.15, paper(0.75), 3);
  layer(ctx, W, H, cam, 0.18);
  ridge(ctx, -60, 420, 120, 420, ink(0.07), 11, paper(0.55));
  layer(ctx, W, H, cam, 0.35);
  ridge(ctx, -120, 300, 40, 230, ink(0.1), 41);
  // The watchtower on a hill to the right.
  poly(ctx, [[520, -120], [760, 150], [1000, -120]], ink(0.1));
  const tx = 760;
  const ty = 150;
  ctx.strokeStyle = ink(0.2);
  ctx.lineWidth = 6;
  for (const [a, b] of [
    [[tx - 40, ty], [tx - 22, ty + 150]],
    [[tx + 40, ty], [tx + 22, ty + 150]],
    [[tx - 34, ty + 30], [tx + 28, ty + 110]],
    [[tx + 34, ty + 30], [tx - 28, ty + 110]],
  ]) {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  ctx.fillStyle = ink(0.2);
  ctx.fillRect(tx - 34, ty + 150, 68, 42);
  poly(ctx, [[tx - 46, ty + 192], [tx, ty + 236], [tx + 46, ty + 192]], ink(0.24));
  ctx.fillStyle = paper(0.7);
  ctx.fillRect(tx - 20, ty + 162, 40, 16);
  // Flag.
  ctx.strokeStyle = ink(0.25);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(tx, ty + 236);
  ctx.lineTo(tx, ty + 300);
  ctx.stroke();
  const wave = Math.sin(t * 0.08) * 8;
  poly(ctx, [[tx, ty + 298], [tx + 50, ty + 288 + wave], [tx, ty + 272]], ember(0.4));
}

/** Twin Decks: a harbour: the sea, ships at anchor, a lighthouse, rigging overhead. */
function twinDecks(ctx: Ctx, W: number, H: number, cam: Cam, t: number) {
  sky(ctx, W, H, '#eadfcd', '#f6eadb');
  layer(ctx, W, H, cam, 0.1);
  clouds(ctx, t, 7, 380, 700, 0.2, paper(0.7), 21);
  layer(ctx, W, H, cam, 0.25);
  // The sea.
  ctx.fillStyle = ink(0.09);
  ctx.fillRect(-4000, -3000, 8000, 2970);
  ctx.strokeStyle = paper(0.45);
  ctx.lineWidth = 4;
  for (let i = 0; i < 26; i++) {
    const y = -50 - (i % 6) * 40 - rand(i) * 20;
    const x = ((rand(i + 5) * 6000 + t * (0.2 + (i % 3) * 0.1)) % 6000) - 3000;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 30, y + 8, x + 60, y);
    ctx.stroke();
  }
  // Ships.
  for (const [sx, s] of [
    [-900, 1],
    [-260, 0.7],
    [1500, 0.85],
  ]) {
    const bob = Math.sin(t * 0.03 + sx) * 3;
    poly(ctx, [[sx - 110 * s, -20 + bob], [sx + 110 * s, -20 + bob], [sx + 85 * s, -55 * s + bob], [sx - 85 * s, -55 * s + bob]].map(([x, y]) => [x, y + 40 * s]), ink(0.18));
    ctx.fillStyle = ink(0.18);
    ctx.fillRect(sx - 4 * s, 20 * s + bob, 8 * s, 190 * s);
    poly(ctx, [[sx + 6 * s, 40 * s + bob], [sx + 90 * s, 50 * s + bob], [sx + 6 * s, 190 * s + bob]], paper(0.8));
    poly(ctx, [[sx - 6 * s, 60 * s + bob], [sx - 70 * s, 66 * s + bob], [sx - 6 * s, 170 * s + bob]], paper(0.65));
    ctx.fillStyle = ember(0.35);
    ctx.fillRect(sx + 6 * s, 98 * s + bob, 46 * s, 8 * s);
  }
  // The lighthouse, its beam turning.
  layer(ctx, W, H, cam, 0.3);
  const lx = 860;
  poly(ctx, [[lx - 60, -40], [lx + 60, -40], [lx + 34, 300], [lx - 34, 300]], paper(0.8));
  for (let i = 0; i < 3; i++) {
    const y0 = 20 + i * 100;
    const w0 = 60 - (y0 + 40) * 0.075;
    const w1 = 60 - (y0 + 80) * 0.075;
    poly(ctx, [[lx - w0, y0], [lx + w0, y0], [lx + w1, y0 + 40], [lx - w1, y0 + 40]], ember(0.3));
  }
  ctx.fillStyle = ink(0.22);
  ctx.fillRect(lx - 40, 300, 80, 46);
  poly(ctx, [[lx - 48, 346], [lx, 392], [lx + 48, 346]], ink(0.26));
  const beam = Math.sin(t * 0.025);
  ctx.fillStyle = paper(0.35 * Math.abs(beam));
  poly(ctx, [[lx, 323], [lx + 700 * beam, 380], [lx + 700 * beam, 266]], paper(0.35 * Math.abs(beam)));
  // Rigging across the top, close by.
  layer(ctx, W, H, cam, 0.85);
  ctx.strokeStyle = ink(0.14);
  ctx.lineWidth = 5;
  for (const [x0, x1, sag] of [
    [-1500, -200, 120],
    [-200, 1300, 150],
    [-900, 700, 90],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x0, 470);
    ctx.quadraticCurveTo((x0 + x1) / 2, 470 - sag * 2, x1, 470);
    ctx.stroke();
  }
}

/** Scaffold: a city going up: a skyline, tower cranes with blinking lights, girder frames. */
function scaffold(ctx: Ctx, W: number, H: number, cam: Cam, t: number) {
  sky(ctx, W, H, '#eee0ca', '#f7e9d6');
  layer(ctx, W, H, cam, 0.12);
  clouds(ctx, t, 6, 450, 800, 0.12, paper(0.6), 33);
  layer(ctx, W, H, cam, 0.18);
  // Far skyline, windows lit here and there.
  for (let x = -3400, i = 0; x < 3400; i++) {
    const w = 90 + rand(i + 3) * 140;
    const h = 120 + rand(i + 7) * 380;
    ctx.fillStyle = ink(0.07);
    ctx.fillRect(x, -60, w, h + 60);
    ctx.fillStyle = paper(0.5);
    for (let wy = 0; wy < h - 30; wy += 34)
      for (let wx = 14; wx < w - 14; wx += 26) if (rand(i * 97 + wy + wx) > 0.72) ctx.fillRect(x + wx, wy, 10, 14);
    x += w + 12;
  }
  // Cranes.
  layer(ctx, W, H, cam, 0.32);
  for (const [cx, h, jib] of [
    [-700, 640, 520],
    [950, 520, -460],
  ]) {
    ctx.strokeStyle = ink(0.18);
    ctx.lineWidth = 5;
    ctx.strokeRect(cx - 18, -60, 36, h + 60);
    for (let y = -60; y < h; y += 44) {
      ctx.beginPath();
      ctx.moveTo(cx - 18, y);
      ctx.lineTo(cx + 18, y + 44);
      ctx.stroke();
    }
    ctx.fillStyle = ink(0.2);
    ctx.fillRect(Math.min(cx, cx + jib) - 20, h, Math.abs(jib) + 40, 22);
    ctx.fillRect(cx - Math.sign(jib) * 160 - 30, h - 40, 60, 40);
    // Hook line and load.
    const hx = cx + jib * 0.7 + Math.sin(t * 0.02) * 6;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + jib * 0.7, h);
    ctx.lineTo(hx, h - 260);
    ctx.stroke();
    ctx.fillStyle = ember(0.3);
    ctx.fillRect(hx - 50, h - 300, 100, 26);
    // Blinking light on top.
    if (Math.floor(t / 40) % 2 === 0) {
      ctx.fillStyle = ember(0.6);
      ctx.beginPath();
      ctx.arc(cx, h + 36, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Girder frames close behind the stage.
  layer(ctx, W, H, cam, 0.55);
  ctx.strokeStyle = ink(0.1);
  ctx.lineWidth = 7;
  for (const [x0, y0, cols, rows] of [
    [-1500, -100, 3, 4],
    [600, -100, 4, 3],
  ]) {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x = x0 + c * 160;
        const y = y0 + r * 140;
        ctx.strokeRect(x, y, 160, 140);
        if ((r + c) % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 160, y + 140);
          ctx.stroke();
        }
      }
  }
}

/** Rafters: inside a big barn: plank walls, tall windows with light coming in, trusses and hanging lamps. */
function rafters(ctx: Ctx, W: number, H: number, cam: Cam, t: number) {
  sky(ctx, W, H, '#e9d8bd', '#f2e3cc');
  layer(ctx, W, H, cam, 0.25);
  ctx.strokeStyle = ink(0.05);
  ctx.lineWidth = 4;
  for (let x = -4000; x < 4000; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, -3000);
    ctx.lineTo(x, 3000);
    ctx.stroke();
  }
  // Windows and the light falling from them.
  for (const wx of [-1500, -500, 500, 1500]) {
    ctx.fillStyle = paper(0.75);
    ctx.beginPath();
    ctx.roundRect(wx - 70, 180, 140, 260, [70, 70, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = ink(0.12);
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(wx, 180);
    ctx.lineTo(wx, 440);
    ctx.moveTo(wx - 70, 300);
    ctx.lineTo(wx + 70, 300);
    ctx.stroke();
    poly(ctx, [[wx - 70, 180], [wx + 70, 180], [wx + 320, -200], [wx + 40, -200]], paper(0.22));
  }
  // Trusses overhead.
  layer(ctx, W, H, cam, 0.6);
  ctx.strokeStyle = ink(0.15);
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(-4000, 470);
  ctx.lineTo(4000, 470);
  ctx.stroke();
  ctx.lineWidth = 9;
  for (let x = -2400; x <= 2400; x += 600) {
    ctx.beginPath();
    ctx.moveTo(x - 300, 470);
    ctx.lineTo(x, 640);
    ctx.lineTo(x + 300, 470);
    ctx.moveTo(x, 470);
    ctx.lineTo(x, 640);
    ctx.stroke();
  }
  // Lamps hanging from the beam, swaying a little.
  for (const lx of [-1200, -400, 400, 1200]) {
    const sway = Math.sin(t * 0.03 + lx) * 0.06;
    const len = 150;
    const ex = lx + Math.sin(sway) * len;
    const ey = 470 - Math.cos(sway) * len;
    ctx.strokeStyle = ink(0.2);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, 470);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.fillStyle = ember(0.1);
    ctx.beginPath();
    ctx.arc(ex, ey - 18, 70, 0, Math.PI * 2);
    ctx.fill();
    poly(ctx, [[ex - 34, ey - 22], [ex + 34, ey - 22], [ex + 14, ey], [ex - 14, ey]], ink(0.25));
    ctx.fillStyle = paper(0.9);
    ctx.beginPath();
    ctx.arc(ex, ey - 26, 9, 0, Math.PI * 2);
    ctx.fill();
  }
}

const SCENERY: Record<StageId, (ctx: Ctx, W: number, H: number, cam: Cam, t: number) => void> = {
  flatline,
  lookout,
  'twin-decks': twinDecks,
  scaffold,
  rafters,
};

/** Draws a stage's scenery over the whole screen (leaves the transform reset). */
export function drawScenery(ctx: Ctx, stage: StageId, W: number, H: number, cam: Cam, time: number) {
  ctx.save();
  SCENERY[stage](ctx, W, H, cam, time);
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
