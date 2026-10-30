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
      prio: 1,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [3, S, { lean: -6, a1: 40, f1: 60, w: 30, t1: 8, t2: -12, dx: -3 }],
        [6, S, { lean: 16, a1: 85, f1: 90, w: 0, t1: 42, s1: 0, t2: -32, s2: -36, dx: 4 }],
        [11, S, { lean: 16, a1: 85, f1: 90, w: 0, t1: 42, s1: 0, t2: -32, s2: -36, dx: 4 }],
        [22, S],
      ),
      hits: blade([6, 8], { dmg: 7, ang: 35, bkb: 30, kbg: 50 }, { dmg: 5, ang: 40, bkb: 25, kbg: 40 }, 11),
    },
    ftilt: {
      // A level side swing: the blade stays at chest height and sweeps around from behind him to the
      // front. Seen from the side it shortens as it turns toward the viewer (ws), then reaches full
      // length in front, where it hits, and turns away again on the follow-through.
      name: 'Level Sweep',
      total: 36,
      prio: 2,
      needsWeapon: true,
      turn: true,
      anim: keys(
        [0, S],
        // (Sword angles past 360 keep the swing going the right way round: over the top on the wind-up.)
        [5, S, { lean: -10, a1: -95, f1: -95, w: 360, a2: 40, f2: 80, t1: 20, s1: 0, t2: -28, s2: -30, dx: -4 }],
        [7, S, { lean: -4, a1: -60, f1: 60, w: 210, ws: 0.85, a2: 20, f2: 60, t1: 30, s1: 0, t2: -32, s2: -34 }],
        [8, S, { lean: 6, a1: 40, f1: 100, w: 350, ws: 0.8, a2: -10, f2: 20, t1: 40, s1: 2, t2: -36, s2: -38, dx: 4 }],
        [9, S, { lean: 16, a1: 88, f1: 90, w: 360, a2: -30, f2: -10, t1: 48, s1: 4, t2: -40, s2: -42, dx: 8 }],
        [12, S, { lean: 18, a1: 95, f1: 96, w: 360, ws: 0.35, a2: -35, f2: -15, t1: 48, s1: 4, t2: -40, s2: -42, dx: 8 }],
        [18, S, { lean: 14, a1: 80, f1: 120, w: 320, ws: 0.75, a2: -30, f2: -10, t1: 44, s1: 2, t2: -38, s2: -40, dx: 6 }],
        [36, S, { w: 400 }],
      ),
      hits: blade([9, 11], { dmg: 12, ang: 40, bkb: 35, kbg: 88 }, { dmg: 10, ang: 42, bkb: 33, kbg: 82 }, 13),
    },
    utilt: {
      name: 'Overhead Arc',
      total: 34,
      prio: 2,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [5, S, { a1: 60, f1: 70, w: 0, lean: 14, t1: 30, s1: -10, t2: -20, s2: -40, dy: -4 }],
        [8, S, { lean: -5, a1: 120, f1: 140, w: 0, t1: 18, s1: -4, t2: -18, s2: -24 }],
        [11, S, { lean: -12, a1: 170, f1: 180, w: 10, t1: 10, s1: 0, t2: -24, s2: -30, dx: -3 }],
        [14, S, { lean: -16, a1: 190, f1: 210, w: 20, t1: 6, s1: 0, t2: -28, s2: -34, dx: -5 }],
        [22, S, { lean: -16, a1: 190, f1: 210, w: 20, t1: 6, s1: 0, t2: -28, s2: -34, dx: -5 }],
        [34, S],
      ),
      hits: blade([8, 14], { dmg: 10, ang: 92, bkb: 40, kbg: 82 }, { dmg: 9, ang: 95, bkb: 40, kbg: 78 }, 13),
    },
    dtilt: {
      // A sweep along the floor that scoops up: crouched low, the blade swings around at the feet from
      // behind him to the front (shortening as it turns toward the viewer), then lifts. Pops opponents up.
      name: 'Floor Scoop',
      total: 32,
      prio: 2,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [5, crouch, { lean: 35, a1: -60, f1: -80, w: 370, a2: 60, f2: 100, t1: 70, s1: -5, t2: 55, s2: -65, dx: -4 }],
        [7, crouch, { lean: 38, a1: -20, f1: 20, w: 250, ws: 0.85, a2: 50, f2: 90, t1: 72, s1: -4, t2: 54, s2: -66 }],
        [8, crouch, { lean: 40, a1: 20, f1: 60, w: 372, ws: 0.8, a2: 30, f2: 70, t1: 74, s1: -2, t2: 52, s2: -68, dx: 3 }],
        [9, crouch, { lean: 42, a1: 40, f1: 70, w: 362, a2: 10, f2: 40, t1: 75, s1: 0, t2: 50, s2: -70, dx: 6 }],
        [12, crouch, { lean: 22, a1: 100, f1: 130, w: 380, a2: 0, f2: 30, t1: 60, s1: -5, t2: 30, s2: -55, dx: 6 }],
        [16, S, { lean: 0, a1: 160, f1: 170, w: 370, dx: 3 }],
        [32, S, { w: 400 }],
      ),
      hits: blade([9, 11], { dmg: 9, ang: 88, bkb: 45, kbg: 30 }, { dmg: 7, ang: 86, bkb: 42, kbg: 28 }, 12),
    },
    nair: {
      name: 'Sword Spin',
      total: 38,
      landLag: 10,
      prio: 2,
      needsWeapon: true,
      anim: keys(
        [0, A],
        [6, A, { a1: 90, f1: 90, w: 0, t1: 80, s1: -10, t2: 60, s2: -40, lean: 10 }],
        [18, A, { a1: 90, f1: 90, w: 0, t1: 80, s1: -10, t2: 60, s2: -40, lean: 10, rot: 360 }],
        [38, A, { rot: 360 }],
      ),
      hits: blade([7, 17], { dmg: 9, ang: 50, bkb: 32, kbg: 72 }, { dmg: 8, ang: 50, bkb: 30, kbg: 66 }, 12),
    },
    fair: {
      name: 'Arc Chop',
      total: 38,
      landLag: 12,
      prio: 3,
      needsWeapon: true,
      turn: true,
      anim: keys(
        [0, A],
        [7, A, { lean: -18, a1: 170, f1: 175, w: 0, t1: 20, s1: -30, t2: -30, s2: -70 }],
        [10, A, { lean: 8, a1: 110, f1: 110, w: 0, t1: 50, s1: -10, t2: -20, s2: -50 }],
        [13, A, { lean: 24, a1: 60, f1: 50, w: 0, t1: 70, s1: 10, t2: -10, s2: -40 }],
        [20, A, { lean: 24, a1: 60, f1: 50, w: 0, t1: 70, s1: 10, t2: -10, s2: -40 }],
        [38, A],
      ),
      hits: blade([10, 14], { dmg: 13, ang: 45, bkb: 35, kbg: 86 }, { dmg: 11, ang: 45, bkb: 33, kbg: 80 }, 13),
    },
    uair: {
      // Like Cloud's up air: the sword held level and lifted from chest height to over his head.
      // Little reach upward, but wide, and low enough at the start to catch opponents standing
      // beside him when he short-hops or lands.
      name: 'Blade Lift',
      total: 30,
      landLag: 8,
      prio: 2,
      needsWeapon: true,
      anim: keys(
        [0, A],
        [4, A, { lean: 10, a1: 75, f1: 115, a2: 60, f2: 120, w: -25, t1: 55, s1: -5, t2: -5, s2: -40 }],
        [6, A, { lean: 2, a1: 140, f1: 160, a2: 125, f2: 165, w: -70, t1: 42, s1: -25, t2: -15, s2: -50 }],
        [9, A, { lean: -6, a1: 195, f1: 175, a2: 185, f2: 178, w: -85, t1: 30, s1: -40, t2: -25, s2: -60 }],
        [15, A, { lean: -6, a1: 195, f1: 175, a2: 185, f2: 178, w: -85, t1: 30, s1: -40, t2: -25, s2: -60 }],
        [30, A],
      ),
      hits: blade([5, 10], { dmg: 10, ang: 85, bkb: 38, kbg: 72 }, { dmg: 9, ang: 88, bkb: 36, kbg: 68 }, 14),
    },
    dair: {
      name: 'Plunge',
      total: 40,
      landLag: 16,
      prio: 3,
      needsWeapon: true,
      anim: keys(
        [0, A],
        [6, A, { a1: 150, f1: 170, w: 10, t1: 70, s1: 30, t2: 50, s2: 10, lean: -8 }],
        [9, A, { lean: 0, a1: 10, f1: 0, w: 0, t1: 50, s1: 10, t2: 40, s2: -10 }],
        [16, A, { lean: 0, a1: 10, f1: 0, w: 0, t1: 50, s1: 10, t2: 40, s2: -10 }],
        [40, A],
      ),
      hits: blade([9, 14], { dmg: 13, ang: -85, bkb: 30, kbg: 70 }, { dmg: 9, ang: 60, bkb: 30, kbg: 60 }, 12),
    },
    nspec: {
      name: 'Grand Slash',
      total: 58,
      prio: 3,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [18, S, { lean: -25, a1: 200, f1: 220, w: 0, t1: 30, s1: 0, t2: -35, s2: -40, dx: -6, dy: 3 }],
        [22, S, { lean: 10, a1: 150, f1: 160, w: 0, t1: 45, s1: 5, t2: -40, s2: -45 }],
        [25, S, { lean: 35, a1: 80, f1: 75, w: 0, t1: 60, s1: 8, t2: -48, s2: -52, dx: 8, dy: -4 }],
        [36, S, { lean: 35, a1: 80, f1: 75, w: 0, t1: 60, s1: 8, t2: -48, s2: -52, dx: 8, dy: -4 }],
        [58, S],
      ),
      hits: blade([21, 26], { dmg: 19, ang: 42, bkb: 40, kbg: 86 }, { dmg: 16, ang: 45, bkb: 36, kbg: 80 }, 16),
      gravity: { f: [0, 30], mul: 0.5 },
    },
    sspec: {
      name: 'Sword Throw',
      total: 30,
      prio: 2,
      needsWeapon: true,
      turn: true,
      anim: keys(
        [0, S],
        [8, S, { lean: -15, a1: -40, f1: -20, w: 0, t1: 25, s1: 0, t2: -25, s2: -30, dx: -4 }],
        [12, S, { lean: 18, a1: 120, f1: 122, w: 0, t1: 45, s1: 5, t2: -40, s2: -45, dx: 4 }],
        [18, S, { lean: 18, a1: 120, f1: 122, w: 0, t1: 45, s1: 5, t2: -40, s2: -45, dx: 4 }],
        [30, S],
      ),
      // Thrown 30 degrees upward.
      proj: [{ f: 12, kind: 'sword', x: 45, y: 45, speed: 15, ang: 30, dmg: 8, hitAng: 40, bkb: 35, kbg: 62 }],
    },
    uspec: {
      // Like Ike's Aether: the sword is tossed straight up (it hits on the way up), then after a short
      // pause Spartan leaps after it, catches it at the top, flips, and plunges straight down sword
      // first (dragging opponents down, and he can catch the ledge on the way), hitting again on
      // landing. Without the sword in hand (thrown), he leaps without the toss. He holds still until the
      // leap, and has super armor from the start until the catch (Caleb's change after the CPU study).
      name: 'Sky Toss',
      total: 44,
      prio: 2,
      drift: 1.3,
      untilLand: 40,
      onLand: 'uspecLand',
      anim: keys(
        [0, S],
        [4, crouch, { a1: 40, f1: 70, w: 0 }],
        [7, S, { lean: -8, a1: 175, f1: 178, w: 0, t1: 15, s1: -5, t2: -20, s2: -30 }],
        [12, crouch, { lean: 20, a1: 120, f1: 150, w: 0, a2: 60, f2: 100 }],
        [14, A, { lean: -5, a1: 175, f1: 178, w: 0, a2: 160, f2: 170, t1: 10, s1: -10, t2: -20, s2: -40 }],
        [30, A, { lean: -5, a1: 178, f1: 180, w: 0, a2: 165, f2: 175, t1: 20, s1: -20, t2: -10, s2: -40 }],
        [36, A, { lean: 0, a1: 10, f1: 0, w: 0, a2: 20, f2: 10, t1: 60, s1: 20, t2: 40, s2: 0, rot: -360 }],
        [40, A, { lean: 0, a1: 5, f1: 0, w: 0, a2: 15, f2: 5, t1: 20, s1: 0, t2: 10, s2: -10, rot: -360 }],
        [44, A, { rot: -360 }],
      ),
      proj: [{ f: 6, kind: 'toss', x: 8, y: 80, speed: 13.5, ang: 90, dmg: 4, hitAng: 88, bkb: 55, kbg: 20 }],
      hits: [
        // Plunging: drags opponents down.
        { f: [37, 40], at: 'tip', r: 15, dmg: 6, ang: -70, bkb: 35, kbg: 20, group: 0 },
        { f: [37, 40], at: 'hand1', to: 'tip', r: 11, dmg: 6, ang: -70, bkb: 35, kbg: 20, group: 0 },
      ],
      vel: [
        { f: 13, vx: 2.5, vy: 15 },
        { f: 37, vx: 0, vy: -13 },
      ],
      still: [1, 12],
      superArmor: [1, 28],
    },
    uspecLand: {
      name: 'Sky Toss (landing)',
      total: 24,
      prio: 2,
      anim: keys([0, crouch, { lean: 40, a1: 40, f1: 70, w: 0 }], [8, crouch, { lean: 30, a1: 50, f1: 75, w: 0 }], [24, S]),
      hits: [
        { f: [0, 2], at: 'tip', r: 18, dmg: 7, ang: 60, bkb: 50, kbg: 72 },
        { f: [0, 2], at: [0, 10], r: 28, dmg: 6, ang: 70, bkb: 48, kbg: 60, away: true },
      ],
    },
    dspec: {
      name: 'Deflect',
      total: 30,
      prio: 1,
      needsWeapon: true,
      anim: keys(
        [0, S],
        [3, S, { a1: 80, f1: 100, w: 70, lean: 10, t1: 30, s1: 0, t2: -25, s2: -30 }],
        [6, S, { a1: 85, f1: 95, w: -5, lean: 14, t1: 32, s1: 0, t2: -28, s2: -32 }],
        [12, S, { a1: 80, f1: 100, w: 70, lean: 10, t1: 30, s1: 0, t2: -25, s2: -30 }],
        [20, S, { a1: 80, f1: 100, w: 70, lean: 10, t1: 30, s1: 0, t2: -25, s2: -30 }],
        [30, S],
      ),
      reflect: { f: [3, 20], x: 40, y: 30, r: 55 },
      hits: blade([4, 7], { dmg: 4, ang: 60, bkb: 45, kbg: 30 }, { dmg: 4, ang: 60, bkb: 45, kbg: 30 }, 11),
    },
  },
};
