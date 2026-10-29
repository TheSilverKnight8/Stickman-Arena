import { pose } from '../skeleton';
import type { CharDef, HitDef } from '../types';
import { baseAnims, keys } from './common';

// SPARTAN: swordfighter. Great range, coverage and disjoints; not very mobile,
// relies on stray hits for damage. A comically large sword, with a projectile
// move that throws it (spec).
//
// The sword is not part of the hurtbox, so it out-ranges attacks that hit the body (a disjoint).

const S = pose({ lean: 6, a1: 30, f1: 95, w: 40, a2: -10, f2: 20, t1: 15, s1: -5, t2: -15, s2: -20 });
const A = pose(S, { t1: 40, s1: -20, t2: -10, s2: -40 });
const crouch = pose(S, { lean: 15, t1: 55, s1: -10, t2: 25, s2: -50 });

/** A sword swing: the tip is the sweet spot, the blade does a little less. */
function blade(f: [number, number], tip: Omit<HitDef, 'f' | 'at' | 'r'>, edge: Omit<HitDef, 'f' | 'at' | 'r'>, r = 12): HitDef[] {
  return [
    { f, at: 'tip', r, ...tip },
    { f, at: 'hand1', to: 'tip', r: r - 4, ...edge },
  ];
}

export const spartan: CharDef = {
  id: 'spartan',
  name: 'Spartan',
  archetype: 'Swordfighter',
  color: '#2c5fd6',
  alt: '#5fb8e8',
  body: { torso: 31, upper: 17, fore: 16, thigh: 21, shin: 21, head: 10, weapon: 94, torsoR: 9.5, limbR: 5 },
  line: 6,
  halfWidth: 16,
  height: 92,
  projLimit: 1,
  armorKb: 0,
  stats: {
    weight: 108,
    run: 5.0,
    groundAccel: 0.7,
    friction: 0.8,
    air: 3.6,
    airAccel: 0.38,
    airFriction: 0.06,
    gravity: 0.49,
    maxFall: 9,
    fastFall: 14.5,
    jump: 12.5,
    shortHop: 8.4,
    doubleJump: 11.5,
    squat: 5,
  },
  anims: baseAnims({
    stand: S,
    air: A,
    runLean: 14,
    runArms: [
      { a1: 10, f1: 80, a2: 60, f2: 110 },
      { a1: 40, f1: 100, a2: -30, f2: 20 },
    ],
    idleShift: { lean: 9, w: 34, dy: -1 },
  }),
  moves: {
    jab: {
      name: 'Sword Poke',
      total: 22,
      needsWeapon: true,
      anim: keys([0, S], [3, S, { lean: -5, a1: 40, f1: 60, w: 30 }], [6, S, { lean: 15, a1: 85, f1: 90, w: 0, t1: 40, s1: 0, t2: -30, s2: -35 }], [11, S, { lean: 15, a1: 85, f1: 90, w: 0, t1: 40, s1: 0, t2: -30, s2: -35 }], [22, S]),
      hits: blade([6, 8], { dmg: 7, ang: 35, bkb: 30, kbg: 50 }, { dmg: 5, ang: 40, bkb: 25, kbg: 40 }, 11),
    },
    ftilt: {
      name: 'Wide Slash',
      total: 36,
      needsWeapon: true,
      turn: true,
      anim: keys(
        [0, S],
        [6, S, { lean: -10, a1: -60, f1: -40, w: -20, t1: 20, s1: 0, t2: -25, s2: -30 }],
        [9, S, { lean: 15, a1: 50, f1: 80, w: 0 }],
        [12, S, { lean: 20, a1: 100, f1: 120, w: 0, t1: 35, s1: 0, t2: -30, s2: -35 }],
        [20, S, { lean: 20, a1: 100, f1: 120, w: 0, t1: 35, s1: 0, t2: -30, s2: -35 }],
        [36, S],
      ),
      hits: blade([8, 12], { dmg: 13, ang: 40, bkb: 35, kbg: 92 }, { dmg: 11, ang: 40, bkb: 35, kbg: 85 }, 13),
    },
    utilt: {
      name: 'Overhead Arc',
      total: 34,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [5, S, { a1: 60, f1: 70, w: 0 }],
        [8, S, { lean: -5, a1: 120, f1: 140, w: 0 }],
        [11, S, { lean: -8, a1: 170, f1: 180, w: 10 }],
        [14, S, { lean: -8, a1: 190, f1: 210, w: 20 }],
        [22, S, { lean: -8, a1: 190, f1: 210, w: 20 }],
        [34, S],
      ),
      hits: blade([8, 14], { dmg: 10, ang: 92, bkb: 40, kbg: 82 }, { dmg: 9, ang: 95, bkb: 40, kbg: 78 }, 13),
    },
    dtilt: {
      name: 'Low Sweep',
      total: 30,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [5, crouch, { lean: 35, t1: 60, s1: -5, t2: 50, s2: -60, a1: 60, f1: 70, w: 0 }],
        [8, crouch, { lean: 40, t1: 60, s1: -5, t2: 50, s2: -60, a1: 80, f1: 92, w: 0 }],
        [12, crouch, { lean: 40, t1: 60, s1: -5, t2: 50, s2: -60, a1: 80, f1: 92, w: 0 }],
        [30, S],
      ),
      hits: blade([8, 10], { dmg: 9, ang: 22, bkb: 38, kbg: 68 }, { dmg: 7, ang: 25, bkb: 35, kbg: 60 }, 11),
    },
    nair: {
      name: 'Sword Spin',
      total: 38,
      landLag: 10,
      needsWeapon: true,
      anim: keys([0, A], [6, A, { a1: 90, f1: 90, w: 0 }], [18, A, { a1: 90, f1: 90, w: 0, rot: 360 }], [38, A, { rot: 360 }]),
      hits: blade([7, 17], { dmg: 9, ang: 50, bkb: 32, kbg: 72 }, { dmg: 8, ang: 50, bkb: 30, kbg: 66 }, 12),
    },
    fair: {
      name: 'Arc Chop',
      total: 38,
      landLag: 12,
      needsWeapon: true,
      turn: true,
      anim: keys(
        [0, A],
        [7, A, { lean: -10, a1: 170, f1: 175, w: 0 }],
        [10, A, { lean: 5, a1: 110, f1: 110, w: 0 }],
        [13, A, { lean: 15, a1: 60, f1: 50, w: 0 }],
        [20, A, { lean: 15, a1: 60, f1: 50, w: 0 }],
        [38, A],
      ),
      hits: blade([10, 14], { dmg: 13, ang: 45, bkb: 35, kbg: 86 }, { dmg: 11, ang: 45, bkb: 33, kbg: 80 }, 13),
    },
    uair: {
      name: 'Sky Arc',
      total: 34,
      landLag: 10,
      needsWeapon: true,
      anim: keys(
        [0, A],
        [6, A, { a1: 80, f1: 80, w: 0 }],
        [9, A, { a1: 140, f1: 150, w: 0 }],
        [12, A, { a1: 190, f1: 200, w: 0 }],
        [15, A, { a1: 230, f1: 250, w: 0 }],
        [22, A, { a1: 230, f1: 250, w: 0 }],
        [34, A],
      ),
      hits: blade([8, 14], { dmg: 11, ang: 88, bkb: 38, kbg: 80 }, { dmg: 9, ang: 90, bkb: 35, kbg: 74 }, 13),
    },
    dair: {
      name: 'Plunge',
      total: 40,
      landLag: 16,
      needsWeapon: true,
      anim: keys(
        [0, A],
        [6, A, { a1: 150, f1: 170, w: 10, t1: 60, s1: 20 }],
        [9, A, { lean: 0, a1: 10, f1: 0, w: 0, t1: 50, s1: 10, t2: 40, s2: -10 }],
        [16, A, { lean: 0, a1: 10, f1: 0, w: 0, t1: 50, s1: 10, t2: 40, s2: -10 }],
        [40, A],
      ),
      hits: blade([9, 14], { dmg: 13, ang: -85, bkb: 30, kbg: 70 }, { dmg: 9, ang: 60, bkb: 30, kbg: 60 }, 12),
    },
    nspec: {
      name: 'Grand Slash',
      total: 58,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [18, S, { lean: -25, a1: 200, f1: 220, w: 0, t1: 30, s1: 0, t2: -35, s2: -40 }],
        [22, S, { lean: 10, a1: 150, f1: 160, w: 0 }],
        [25, S, { lean: 35, a1: 80, f1: 75, w: 0, t1: 55, s1: 5, t2: -45, s2: -50 }],
        [36, S, { lean: 35, a1: 80, f1: 75, w: 0, t1: 55, s1: 5, t2: -45, s2: -50 }],
        [58, S],
      ),
      hits: blade([21, 26], { dmg: 19, ang: 42, bkb: 40, kbg: 86 }, { dmg: 16, ang: 45, bkb: 36, kbg: 80 }, 16),
      gravity: { f: [0, 30], mul: 0.5 },
    },
    sspec: {
      name: 'Sword Throw',
      total: 30,
      needsWeapon: true,
      turn: true,
      anim: keys([0, S], [8, S, { lean: -15, a1: -40, f1: -20, w: 0 }], [12, S, { lean: 20, a1: 90, f1: 95, w: 0 }], [18, S, { lean: 20, a1: 90, f1: 95, w: 0 }], [30, S]),
      proj: [{ f: 12, kind: 'sword', x: 50, y: 30, speed: 15, ang: 0, dmg: 8, hitAng: 40, bkb: 35, kbg: 62 }],
    },
    uspec: {
      name: 'Rising Slash',
      total: 42,
      drift: 1.05,
      anim: keys(
        [0, S],
        [5, crouch, { a1: 60, f1: 60, w: 0 }],
        [7, S, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40 }],
        [22, S, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40, rot: -360 }],
        [42, A, { rot: -360 }],
      ),
      hits: [
        { f: [7, 20], at: 'tip', r: 13, dmg: 3, ang: 85, bkb: 30, kbg: 8, rehit: 5, group: 0 },
        { f: [7, 20], at: 'hand1', to: 'tip', r: 9, dmg: 3, ang: 85, bkb: 30, kbg: 8, rehit: 5, group: 0 },
        { f: [21, 23], at: 'tip', r: 14, dmg: 6, ang: 70, bkb: 55, kbg: 75, group: 1 },
        { f: [21, 23], at: 'hand1', to: 'tip', r: 10, dmg: 6, ang: 70, bkb: 55, kbg: 75, group: 1 },
      ],
      vel: [{ f: 6, vx: 1.5, vy: 14.7 }],
    },
    dspec: {
      name: 'Deflect',
      total: 30,
      needsWeapon: true,
      anim: keys([0, S], [3, S, { a1: 80, f1: 100, w: 70 }], [6, S, { a1: 85, f1: 95, w: -5 }], [12, S, { a1: 80, f1: 100, w: 70 }], [20, S, { a1: 80, f1: 100, w: 70 }], [30, S]),
      reflect: { f: [3, 20], x: 40, y: 30, r: 55 },
      hits: blade([4, 7], { dmg: 4, ang: 60, bkb: 45, kbg: 30 }, { dmg: 4, ang: 60, bkb: 45, kbg: 30 }, 11),
    },
  },
};
