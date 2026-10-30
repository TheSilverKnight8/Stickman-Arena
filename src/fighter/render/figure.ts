import { dcos, dsin } from '../sim/fmath';
import type { Joints } from '../sim/skeleton';
import type { CharDef, CharId } from '../sim/types';

// Draws one stick figure from its joints. Every figure has a navy outline under
// its colour so it reads on the cream background, plus props that say who it
// is: gloves and a bandana, the sword and a knight's helmet, the bow with a hat
// and quiver, big arms and fists, a cape, wings.

export const NAVY = '#002657';
export const CREAM = '#faeeda';
export const RED = '#fc3f3f';

export interface FigureStyle {
  color: string;
  /** 0..1 */
  alpha?: number;
  /** Draw in white (hit flash). */
  flash?: boolean;
  /** Spartan's sword is flying: draw no sword. */
  noWeapon?: boolean;
  /** For animated bits that are not part of the simulation (scarf flutter, wing flaps). */
  time?: number;
  facing?: number;
  /** In the air: Valkyrie's wings spread and flap. */
  airborne?: boolean;
  /** Gliding: the wings stay spread wide. */
  gliding?: boolean;
  /** A wing move (Wing Flare, Gale Burst): the wings beat open. */
  flare?: boolean;
  /** Ranger's dagger is out (a dagger move); otherwise it sits in its sheath at the hip. */
  dagger?: boolean;
}

type Ctx = CanvasRenderingContext2D;
type P = [number, number];

function line(ctx: Ctx, pts: P[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

/**
 * Draws in world units; the caller has already set up the camera transform
 * (y up is handled by the caller flipping the canvas).
 */
export function drawFigure(ctx: Ctx, c: CharDef, j: Joints, st: FigureStyle) {
  const color = st.flash ? '#ffffff' : st.color;
  const w = c.line;
  ctx.save();
  ctx.globalAlpha = st.alpha ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const backArm: P[] = [j.neck, j.elbow2, j.hand2];
  const backLeg: P[] = [j.hip, j.knee2, j.foot2];
  const frontArm: P[] = [j.neck, j.elbow1, j.hand1];
  const frontLeg: P[] = [j.hip, j.knee1, j.foot1];
  const torso: P[] = [j.hip, j.neck];

  // Phantom's cape hangs from the shoulders, Valkyrie's wings spread from the back, Ranger's quiver sits on the back (decoration only).
  if (c.id === 'phantom') drawCape(ctx, j, st);
  if (c.id === 'valkyrie') drawWings(ctx, j, st);
  if (c.id === 'ranger') drawQuiver(ctx, j, st);

  // Back limbs are a little darker, so arms and legs read in front/behind.
  const aw = c.armLine ?? w;
  const parts: [P[], string, number][] = [
    [backArm, shade(color, -0.18), aw],
    [backLeg, shade(color, -0.18), w],
    [torso, color, w],
    [frontLeg, color, w],
    [frontArm, color, aw],
  ];
  for (const [pts, col, lw] of parts) {
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = lw + 3.5;
    line(ctx, pts);
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    line(ctx, pts);
  }

  // Head: a ring, like the app icon.
  const hr = c.body.head;
  ctx.fillStyle = CREAM;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = w + 3.5;
  ctx.beginPath();
  ctx.arc(j.head[0], j.head[1], hr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();

  drawProp(ctx, c.id, c, j, st, color);
  ctx.restore();
}

function drawProp(ctx: Ctx, id: CharId, c: CharDef, j: Joints, st: FigureStyle, color: string) {
  switch (id) {
    case 'fisticuffs':
      // Boxing gloves and a bandana.
      for (const h of [j.hand2, j.hand1]) blob(ctx, h, 6.5, color);
      drawBandana(ctx, j, c.body.head, st, color);
      break;
    case 'buster':
      // Big knuckled fists at the end of the long arms.
      for (const h of [j.hand2, j.hand1]) blob(ctx, h, 13, color);
      break;
    case 'spartan':
      if (!st.noWeapon) drawSword(ctx, j.hand1, j.tip, c.body.weapon);
      drawHelmet(ctx, j, c.body.head, st);
      break;
    case 'ranger':
      if (st.dagger) drawDagger(ctx, j.hand2, j.tip2);
      else drawSheath(ctx, j, st);
      drawBow(ctx, j.elbow1, j.hand1);
      drawHat(ctx, j, c.body.head, color);
      break;
    case 'valkyrie':
      drawSword(ctx, j.hand1, j.tip, c.body.weapon);
      break;
  }
}

/**
 * Two wings from the upper back: folded down behind on the ground, spread up
 * and beating in the air. They follow the torso, so they turn with spins.
 */
function drawWings(ctx: Ctx, j: Joints, st: FigureStyle) {
  const facing = st.facing ?? 1;
  const tx = j.neck[0] - j.hip[0];
  const ty = j.neck[1] - j.hip[1];
  const tl = Math.hypot(tx, ty) || 1;
  const u: P = [tx / tl, ty / tl];
  const back: P = [-facing * u[1], facing * u[0]];
  const base: P = [j.hip[0] + tx * 0.72, j.hip[1] + ty * 0.72];
  const t = st.time ?? 0;
  const flap = st.flare ? 30 : st.gliding ? Math.sin(t * 0.08) * 4 : st.airborne ? Math.sin(t * 0.32) * 22 : Math.sin(t * 0.05) * 3;
  const spread = st.flare ? 1.2 : st.gliding ? 1.25 : st.airborne ? 1 : 0;
  const len = st.flare ? 46 : st.gliding ? 46 : st.airborne ? 40 : 33;
  const one = (deg: number, fill: string) => {
    const a = (deg * Math.PI) / 180;
    const d: P = [back[0] * Math.cos(a) + u[0] * Math.sin(a), back[1] * Math.cos(a) + u[1] * Math.sin(a)];
    const n: P = [u[0] * Math.cos(a) - back[0] * Math.sin(a), u[1] * Math.cos(a) - back[1] * Math.sin(a)];
    const at = (along: number, out: number): P => [base[0] + d[0] * len * along + n[0] * len * out, base[1] + d[1] * len * along + n[1] * len * out];
    const pts: P[] = [at(0, 0), at(0.45, 0.2), at(1, 0.08), at(0.8, -0.12), at(0.7, -0.02), at(0.6, -0.22), at(0.47, -0.08), at(0.36, -0.25), at(0.15, -0.1)];
    ctx.fillStyle = fill;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Feather lines in the fighter's colour.
    ctx.strokeStyle = st.flash ? '#ffffff' : st.color;
    ctx.lineWidth = 2;
    line(ctx, [at(0.12, 0.02), at(0.8, 0.06)]);
    line(ctx, [at(0.2, -0.05), at(0.56, -0.12)]);
  };
  const angle = -55 + spread * 90 + flap;
  one(angle + 14, shade(CREAM, -0.14));
  one(angle, CREAM);
}

function blob(ctx: Ctx, p: P, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * The comically large sword: a broad blade from the hand to the tip, with a
 * crossguard. Drawn shorter than its length, it is being swung toward or away
 * from the viewer; nearly end-on, only the guard and the blade's end show.
 */
export function drawSword(ctx: Ctx, hand: P, tip: P, length: number) {
  const dx = tip[0] - hand[0];
  const dy = tip[1] - hand[1];
  const len = Math.hypot(dx, dy) || length;
  if (len < 26) {
    ctx.fillStyle = '#e4ebf5';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(hand[0], hand[1], 9, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 6;
    line(ctx, [
      [hand[0] - 12, hand[1]],
      [hand[0] + 12, hand[1]],
    ]);
    return;
  }
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const half = 7;
  const base: P = [hand[0] + ux * 8, hand[1] + uy * 8];
  ctx.fillStyle = '#e4ebf5';
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(base[0] + nx * half, base[1] + ny * half);
  ctx.lineTo(tip[0] - ux * 16 + nx * half, tip[1] - uy * 16 + ny * half);
  ctx.lineTo(tip[0], tip[1]);
  ctx.lineTo(tip[0] - ux * 16 - nx * half, tip[1] - uy * 16 - ny * half);
  ctx.lineTo(base[0] - nx * half, base[1] - ny * half);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Fuller (the groove down the blade).
  ctx.strokeStyle = 'rgba(0, 38, 87, 0.35)';
  ctx.lineWidth = 2;
  line(ctx, [base, [tip[0] - ux * 22, tip[1] - uy * 22]]);
  // Crossguard and grip.
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 6;
  line(ctx, [
    [base[0] + nx * 13, base[1] + ny * 13],
    [base[0] - nx * 13, base[1] - ny * 13],
  ]);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  line(ctx, [
    [hand[0] - ux * 7, hand[1] - uy * 7],
    [base[0], base[1]],
  ]);
}

/** A bow held in the front hand, across the forearm. */
function drawBow(ctx: Ctx, elbow: P, hand: P) {
  const dx = hand[0] - elbow[0];
  const dy = hand[1] - elbow[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const r = 26;
  const a: P = [hand[0] + nx * r, hand[1] + ny * r];
  const b: P = [hand[0] - nx * r, hand[1] - ny * r];
  const bulge: P = [hand[0] + ux * 13, hand[1] + uy * 13];
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(bulge[0] * 2 - (a[0] + b[0]) / 2, bulge[1] * 2 - (a[1] + b[1]) / 2, b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 38, 87, 0.7)';
  ctx.lineWidth = 1.5;
  line(ctx, [a, b]);
}

/** Ranger's dagger, from the back hand along the forearm: a short steel blade, a guard and a grip. */
function drawDagger(ctx: Ctx, hand: P, tip: P) {
  const dx = tip[0] - hand[0];
  const dy = tip[1] - hand[1];
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const base: P = [hand[0] + ux * 3, hand[1] + uy * 3];
  const end: P = [hand[0] + ux * (len + 6), hand[1] + uy * (len + 6)];
  ctx.fillStyle = '#e4ebf5';
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(base[0] + nx * 3.5, base[1] + ny * 3.5);
  ctx.lineTo(end[0], end[1]);
  ctx.lineTo(base[0] - nx * 3.5, base[1] - ny * 3.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 4;
  line(ctx, [
    [base[0] + nx * 6, base[1] + ny * 6],
    [base[0] - nx * 6, base[1] - ny * 6],
  ]);
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 3.5;
  line(ctx, [
    [hand[0] - ux * 5, hand[1] - uy * 5],
    [base[0], base[1]],
  ]);
}

/** The dagger put away: a small sheath at the back of the hip. */
function drawSheath(ctx: Ctx, j: Joints, st: FigureStyle) {
  const facing = st.facing ?? 1;
  const tx = j.neck[0] - j.hip[0];
  const ty = j.neck[1] - j.hip[1];
  const tl = Math.hypot(tx, ty) || 1;
  const u: P = [tx / tl, ty / tl];
  const back: P = [-facing * u[1], facing * u[0]];
  const top: P = [j.hip[0] + back[0] * 7 + u[0] * 4, j.hip[1] + back[1] * 7 + u[1] * 4];
  const bottom: P = [top[0] + back[0] * 8 - u[0] * 18, top[1] + back[1] * 8 - u[1] * 18];
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 8;
  line(ctx, [top, bottom]);
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 4.5;
  line(ctx, [top, bottom]);
}

/** Ranger's wide-brimmed hat, set on the head along the body's tilt. */
function drawHat(ctx: Ctx, j: Joints, hr: number, color: string) {
  const tx = j.head[0] - j.neck[0];
  const ty = j.head[1] - j.neck[1];
  const tl = Math.hypot(tx, ty) || 1;
  const u: P = [tx / tl, ty / tl];
  const n: P = [u[1], -u[0]];
  const at = (up: number, side: number): P => [j.head[0] + u[0] * up + n[0] * side, j.head[1] + u[1] * up + n[1] * side];
  // Crown.
  const crown = [at(hr * 0.45, -hr * 0.85), at(hr * 1.55, -hr * 0.7), at(hr * 1.7, 0), at(hr * 1.55, hr * 0.7), at(hr * 0.45, hr * 0.85)];
  ctx.fillStyle = '#c8a165';
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(crown[0][0], crown[0][1]);
  for (const p of crown.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Band in the fighter's colour.
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  line(ctx, [at(hr * 0.75, -hr * 0.82), at(hr * 0.75, hr * 0.82)]);
  // Wide brim.
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 6.5;
  line(ctx, [at(hr * 0.4, -hr * 2), at(hr * 0.4, hr * 2)]);
  ctx.strokeStyle = '#c8a165';
  ctx.lineWidth = 3.5;
  line(ctx, [at(hr * 0.4, -hr * 1.9), at(hr * 0.4, hr * 1.9)]);
}

/** Ranger's quiver on the back, with arrow feathers showing over the shoulder. */
function drawQuiver(ctx: Ctx, j: Joints, st: FigureStyle) {
  const facing = st.facing ?? 1;
  const tx = j.neck[0] - j.hip[0];
  const ty = j.neck[1] - j.hip[1];
  const tl = Math.hypot(tx, ty) || 1;
  const u: P = [tx / tl, ty / tl];
  const back: P = [-facing * u[1], facing * u[0]];
  // Slung at a slant across the back.
  const d: P = [u[0] * 0.92 + back[0] * 0.4, u[1] * 0.92 + back[1] * 0.4];
  const base: P = [j.hip[0] + tx * 0.25 + back[0] * 9, j.hip[1] + ty * 0.25 + back[1] * 9];
  const top: P = [base[0] + d[0] * 36, base[1] + d[1] * 36];
  // Feathers.
  for (const k of [-4, 1, 6]) {
    const f0: P = [top[0] + back[0] * k * 0.6, top[1] + back[1] * k * 0.6];
    const f1: P = [f0[0] + d[0] * 11, f0[1] + d[1] * 11];
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 5;
    line(ctx, [f0, f1]);
    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 2.5;
    line(ctx, [f0, f1]);
  }
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 12;
  line(ctx, [base, top]);
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 8;
  line(ctx, [base, top]);
}

/** Directions for drawing on the head: `u` up the head (from the neck), `front` the way the fighter faces. */
function headFrame(j: Joints, st: FigureStyle) {
  const tx = j.head[0] - j.neck[0];
  const ty = j.head[1] - j.neck[1];
  const tl = Math.hypot(tx, ty) || 1;
  const u: P = [tx / tl, ty / tl];
  const f = st.facing ?? 1;
  const front: P = [u[1] * f, -u[0] * f];
  return { u, front, at: (up: number, fwd: number): P => [j.head[0] + u[0] * up + front[0] * fwd, j.head[1] + u[1] * up + front[1] * fwd] };
}

/** Fisticuffs' bandana: a band across the brow in a deep shade of his colour with cream dots, knotted at the back, the tails flying. */
function drawBandana(ctx: Ctx, j: Joints, hr: number, st: FigureStyle, color: string) {
  const { at } = headFrame(j, st);
  const cloth = st.flash ? '#ffffff' : shade(color, -0.3);
  const t = st.time ?? 0;
  // The band.
  const band: P[] = [at(hr * 0.15, hr * 1.08), at(hr * 0.55, hr * 0.95), at(hr * 0.75, 0), at(hr * 0.55, -hr * 1.02), at(hr * 0.12, -hr * 1.1)];
  ctx.fillStyle = cloth;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(band[0][0], band[0][1]);
  ctx.quadraticCurveTo(band[1][0], band[1][1], band[2][0], band[2][1]);
  ctx.quadraticCurveTo(band[3][0], band[3][1], band[4][0], band[4][1]);
  const low: P[] = [at(-hr * 0.2, -hr * 1.05), at(hr * 0.2, 0), at(-hr * 0.15, hr * 1.04)];
  ctx.lineTo(low[0][0], low[0][1]);
  ctx.quadraticCurveTo(low[1][0], low[1][1], low[2][0], low[2][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = CREAM;
  for (const [up, fwd] of [[0.3, 0.55], [0.38, -0.1], [0.25, -0.65]]) {
    const p = at(hr * up, hr * fwd);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // The knot at the back and two tails streaming behind.
  const knot = at(hr * 0.05, -hr * 1.15);
  for (const [k, droop] of [[0, 0], [1, 7]]) {
    const pts: P[] = [knot];
    for (let i = 1; i <= 3; i++) {
      const wave = dsin(t * 11 + i * 80 + k * 40) * 3;
      pts.push(at(-hr * 0.1 - droop * i * 0.35 + wave, -hr * 1.15 - i * 6.5));
    }
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6.5;
    line(ctx, pts);
    ctx.strokeStyle = cloth;
    ctx.lineWidth = 3.5;
    line(ctx, pts);
  }
  ctx.fillStyle = cloth;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(knot[0], knot[1], 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** Spartan's knight's helmet: a steel helm over the whole head, a visor slit at the front, a red plume. */
function drawHelmet(ctx: Ctx, j: Joints, hr: number, st: FigureStyle) {
  const { at } = headFrame(j, st);
  const r = hr + 2.5;
  const steel = st.flash ? '#ffffff' : '#cfd8e6';
  // The plume, sweeping back from the crown (drawn first, behind the helm).
  const base = at(r * 0.85, -r * 0.1);
  const tip = at(r * 0.55, -r * 2.3);
  const ctl = at(r * 2.1, -r * 1.2);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(base[0], base[1]);
  ctx.quadraticCurveTo(ctl[0], ctl[1], tip[0], tip[1]);
  ctx.stroke();
  ctx.strokeStyle = st.flash ? '#ffffff' : RED;
  ctx.lineWidth = 5.5;
  ctx.stroke();
  // The helm: a dome on top, a straight face guard, flat at the neck.
  const pts: P[] = [at(-r * 0.95, -r * 0.85), at(r * 0.35, -r * 1.02), at(r * 0.98, -r * 0.4), at(r * 0.98, r * 0.4), at(r * 0.45, r * 1.02), at(-r * 0.95, r * 1.02)];
  ctx.fillStyle = steel;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.quadraticCurveTo(at(r * 1.05, -r * 1.05)[0], at(r * 1.05, -r * 1.05)[1], pts[2][0], pts[2][1]);
  ctx.lineTo(pts[3][0], pts[3][1]);
  ctx.quadraticCurveTo(at(r * 1.05, r * 1.05)[0], at(r * 1.05, r * 1.05)[1], pts[4][0], pts[4][1]);
  ctx.lineTo(pts[5][0], pts[5][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Visor slit and a ridge down the front.
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 2.5;
  line(ctx, [at(r * 0.12, r * 0.15), at(r * 0.12, r * 1.0)]);
  ctx.lineWidth = 1.5;
  line(ctx, [at(r * 0.9, r * 0.55), at(-r * 0.85, r * 0.55)]);
  // Breaths under the slit.
  ctx.fillStyle = NAVY;
  for (const k of [0.45, 0.75]) {
    const p = at(-r * 0.3, r * k);
    ctx.beginPath();
    ctx.arc(p[0], p[1], 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Phantom's cape: from the shoulders down the back to the knees, rippling, and streaming out behind in the air. */
function drawCape(ctx: Ctx, j: Joints, st: FigureStyle) {
  const facing = st.facing ?? 1;
  const tx = j.neck[0] - j.hip[0];
  const ty = j.neck[1] - j.hip[1];
  const tl = Math.hypot(tx, ty) || 1;
  const u: P = [tx / tl, ty / tl];
  const back: P = [-facing * u[1], facing * u[0]];
  const t = st.time ?? 0;
  const len = tl * 1.75;
  const spread = st.airborne ? 26 : 14;
  const wave = (k: number) => dsin(t * 7 + k * 90) * (st.airborne ? 5 : 3);
  const at = (down: number, out: number): P => [j.neck[0] - u[0] * down + back[0] * out, j.neck[1] - u[1] * down + back[1] * out];
  const red = st.flash ? '#ffffff' : RED;
  const pts: P[] = [
    at(-2, 1),
    at(2, 9),
    at(len * 0.5, spread * 0.7 + 6 + wave(1)),
    at(len, spread + 8 + wave(2)),
    at(len * 1.02, spread * 0.55 + 4 + wave(3)),
    at(len * 0.96, spread * 0.15 + 2 + wave(4)),
    at(len * 0.5, 3),
  ];
  ctx.fillStyle = red;
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  ctx.lineTo(pts[1][0], pts[1][1]);
  ctx.quadraticCurveTo(pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
  ctx.quadraticCurveTo(pts[4][0], pts[4][1], pts[5][0], pts[5][1]);
  ctx.quadraticCurveTo(pts[6][0], pts[6][1], pts[0][0], pts[0][1]);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // A fold down the middle, and the collar.
  ctx.strokeStyle = shade(RED, -0.3);
  ctx.lineWidth = 2;
  line(ctx, [at(6, 5), at(len * 0.85, spread * 0.6 + 5 + wave(2) * 0.6)]);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 7;
  line(ctx, [at(-1, -3), at(-1, 6)]);
  ctx.strokeStyle = red;
  ctx.lineWidth = 4;
  line(ctx, [at(-1, -3), at(-1, 6)]);
}

/**
 * A fighter's colour for the n-th copy of the same fighter in a match: its
 * colour, then its alternate, then a lighter and a darker shade of the colour.
 */
export function fighterColor(c: CharDef, palette: number) {
  return palette === 0 ? c.color : palette === 1 ? c.alt : shade(c.color, palette === 2 ? 0.45 : -0.45);
}

/** Lighten (+) or darken (−) a #rrggbb colour. */
export function shade(hex: string, k: number) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k);
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Direction vector for an angle (0 = forward, 90 = up), for drawing only. */
export function dirOf(angle: number, facing: number): P {
  return [dcos(angle) * facing, dsin(angle)];
}
