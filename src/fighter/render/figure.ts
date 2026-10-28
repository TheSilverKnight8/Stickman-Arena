import { dcos, dsin } from '../sim/fmath';
import type { Joints } from '../sim/skeleton';
import type { CharDef, CharId } from '../sim/types';

// Draws one stick figure from its joints. Every figure has a navy outline under
// its colour so it reads on the cream background (Buster's yellow especially),
// plus one prop that says who it is: gloves, the sword, the bow, big fists, a scarf.

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
  /** For animated bits that are not part of the simulation (scarf flutter). */
  time?: number;
  facing?: number;
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

  // Phantom's scarf trails behind the neck (decoration only).
  if (c.id === 'phantom') drawScarf(ctx, j, st);

  // Back limbs are a little darker, so arms and legs read in front/behind.
  const parts: [P[], string][] = [
    [backArm, shade(color, -0.18)],
    [backLeg, shade(color, -0.18)],
    [torso, color],
    [frontLeg, color],
    [frontArm, color],
  ];
  for (const [pts, col] of parts) {
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = w + 3.5;
    line(ctx, pts);
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
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
      // Boxing gloves.
      for (const h of [j.hand2, j.hand1]) blob(ctx, h, 6.5, color);
      // Headband tails.
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 3;
      line(ctx, [
        [j.head[0] - (st.facing ?? 1) * 9, j.head[1] + 2],
        [j.head[0] - (st.facing ?? 1) * 18, j.head[1] - 3],
      ]);
      break;
    case 'buster':
      for (const h of [j.hand2, j.hand1]) blob(ctx, h, 10, color);
      break;
    case 'spartan':
      if (!st.noWeapon) drawSword(ctx, j.hand1, j.tip, c.body.weapon);
      // Helmet crest.
      ctx.fillStyle = RED;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(j.head[0] - (st.facing ?? 1) * 3, j.head[1] + c.body.head + 2, 9, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'ranger':
      drawBow(ctx, j.elbow1, j.hand1);
      break;
  }
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

/** The comically large sword: a broad blade from the hand to the tip, with a crossguard. */
export function drawSword(ctx: Ctx, hand: P, tip: P, length: number) {
  const dx = tip[0] - hand[0];
  const dy = tip[1] - hand[1];
  const len = Math.hypot(dx, dy) || length;
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

function drawScarf(ctx: Ctx, j: Joints, st: FigureStyle) {
  const f = st.facing ?? 1;
  const t = st.time ?? 0;
  const n = j.neck;
  const pts: P[] = [[n[0], n[1] + 2]];
  for (let i = 1; i <= 3; i++) pts.push([n[0] - f * i * 13, n[1] + 2 + dsin(t * 9 + i * 70) * 4 - i * 2]);
  ctx.strokeStyle = NAVY;
  ctx.lineWidth = 8;
  line(ctx, pts);
  ctx.strokeStyle = RED;
  ctx.lineWidth = 5;
  line(ctx, pts);
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
