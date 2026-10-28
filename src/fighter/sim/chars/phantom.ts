import { pose } from '../skeleton';
import type { CharDef } from '../types';
import { baseAnims, keys } from './common';

// PHANTOM: hit and run. Excellent mobility, safe moves; inconsistent damage
// and kill power, poor survivability and defense. Plenty of movement and
// poking moves, with agile hurtbox shifting (spec).
//
// Hurtbox shifting: hurtboxes come from the skeleton, and Phantom's poses are
// built so the body pulls away while a thin limb reaches out. The pokes lean
// the torso back, the slide drops the body almost to the floor, the up tilt
// arches backward under the kick. Limbs are thinner than everyone else's.

const S = pose({ lean: 25, a1: 75, f1: 95, a2: -20, f2: -40, t1: 45, s1: -5, t2: -40, s2: -35 });
const A = pose(S, { lean: 15, t1: 50, s1: -25, t2: -20, s2: -50, a1: 100, f1: 110, a2: -40, f2: -70 });
const crouch = pose(S, { lean: 30, t1: 60, s1: -10, t2: 20, s2: -60 });

export const phantom: CharDef = {
  id: 'phantom',
  name: 'Phantom',
  archetype: 'Hit and Run',
  color: '#8a3ffc',
  alt: '#d36ad6',
  body: { torso: 29, upper: 17, fore: 17, thigh: 22, shin: 22, head: 9, weapon: 0, torsoR: 7, limbR: 3.5 },
  line: 4.5,
  halfWidth: 14,
  height: 86,
  projLimit: 1,
  armorKb: 0,
  stats: {
    weight: 78,
    run: 8.0,
    groundAccel: 1.3,
    friction: 1.0,
    air: 5.2,
    airAccel: 0.62,
    airFriction: 0.12,
    gravity: 0.5,
    maxFall: 9,
    fastFall: 13,
    jump: 14.5,
    shortHop: 9.6,
    doubleJump: 14,
    squat: 3,
  },
  anims: baseAnims({
    stand: S,
    air: A,
    runLean: 32,
    runArms: [
      { a1: -60, f1: -80, a2: -70, f2: -90 },
      { a1: -50, f1: -70, a2: -60, f2: -80 },
    ],
    // The idle sway shifts the body back and forth.
    idleShift: { lean: 36, dx: -5, a1: 70, f1: 85 },
    idleFrames: 40,
  }),
  moves: {
    jab: {
      name: 'Quick Poke',
      total: 12,
      anim: keys([0, S], [2, S, { lean: 0, dx: -6, a1: 90, f1: 90 }], [6, S, { lean: 0, dx: -6, a1: 90, f1: 90 }], [12, S]),
      hits: [{ f: [2, 4], at: 'hand1', r: 9, dmg: 3, ang: 45, bkb: 25, kbg: 32 }],
    },
    ftilt: {
      name: 'Lunge Poke',
      total: 24,
      turn: true,
      anim: keys([0, S], [4, S, { lean: 50, t1: 70, s1: 30, t2: -60, s2: -60, a1: 90, f1: 90, dx: 6 }], [10, S, { lean: 50, t1: 70, s1: 30, t2: -60, s2: -60, a1: 90, f1: 90, dx: 6 }], [24, S]),
      hits: [{ f: [6, 9], at: 'hand1', r: 10, dmg: 7, ang: 40, bkb: 30, kbg: 58 }],
      vel: [{ f: 5, vx: 10, when: 'ground' }],
    },
    utilt: {
      name: 'Arc Kick',
      total: 22,
      anim: keys(
        [0, S],
        [3, S, { lean: -40, dx: -8, t1: 120, s1: 140, t2: -10, s2: -30, a1: -60, f1: -80, a2: -100, f2: -120 }],
        [6, S, { lean: -50, dx: -8, t1: 175, s1: 185, t2: -10, s2: -30, a1: -60, f1: -80, a2: -100, f2: -120 }],
        [9, S, { lean: -50, dx: -8, t1: 210, s1: 220, t2: -10, s2: -30, a1: -60, f1: -80, a2: -100, f2: -120 }],
        [22, S],
      ),
      hits: [{ f: [4, 9], at: 'foot1', r: 11, dmg: 6, ang: 95, bkb: 35, kbg: 88 }],
    },
    dtilt: {
      name: 'Slide',
      total: 26,
      anim: keys(
        [0, S],
        [3, S, { lean: -70, t1: 95, s1: 95, t2: 60, s2: 40, a1: -100, f1: -110, a2: -60, f2: -90 }],
        [16, S, { lean: -70, t1: 95, s1: 95, t2: 60, s2: 40, a1: -100, f1: -110, a2: -60, f2: -90 }],
        [26, S],
      ),
      hits: [{ f: [4, 14], at: 'foot1', r: 10, dmg: 6, ang: 72, bkb: 45, kbg: 32 }],
      vel: [{ f: 3, vx: 11, when: 'ground' }],
    },
    nair: {
      name: 'Whirl',
      total: 22,
      landLag: 5,
      anim: keys(
        [0, A],
        [3, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 80, s1: 90, t2: -80, s2: -90 }],
        [10, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 80, s1: 90, t2: -80, s2: -90, rot: 360 }],
        [22, A, { rot: 360 }],
      ),
      hits: [
        { f: [4, 10], at: 'foot1', r: 9, dmg: 5, ang: 50, bkb: 25, kbg: 52, away: true },
        { f: [4, 10], at: 'foot2', r: 9, dmg: 5, ang: 50, bkb: 25, kbg: 52, away: true },
        { f: [4, 10], at: 'hand1', r: 8, dmg: 5, ang: 50, bkb: 25, kbg: 52, away: true },
      ],
    },
    fair: {
      name: 'Air Lunge',
      total: 24,
      landLag: 6,
      turn: true,
      anim: keys([0, A], [5, A, { lean: 60, a1: 92, f1: 90, t1: 20, s1: -10, t2: -60, s2: -80 }], [10, A, { lean: 60, a1: 92, f1: 90, t1: 20, s1: -10, t2: -60, s2: -80 }], [24, A]),
      hits: [
        { f: [6, 9], at: 'hand1', r: 9, dmg: 8, ang: 38, bkb: 30, kbg: 92 },
        { f: [6, 9], at: 'elbow1', to: 'hand1', r: 7, dmg: 6, ang: 45, bkb: 25, kbg: 50 },
      ],
      vel: [{ f: 5, vx: 3, add: true }],
    },
    uair: {
      name: 'Scissor Kick',
      total: 22,
      landLag: 5,
      anim: keys(
        [0, A],
        [3, A, { lean: -20, t1: 150, s1: 160, t2: -150, s2: -160 }],
        [6, A, { lean: -20, t1: 200, s1: 200, t2: -200, s2: -200 }],
        [10, A, { lean: -20, t1: 200, s1: 200, t2: -200, s2: -200 }],
        [22, A],
      ),
      hits: [
        { f: [4, 8], at: 'foot1', r: 10, dmg: 6, ang: 85, bkb: 30, kbg: 58 },
        { f: [4, 8], at: 'foot2', r: 10, dmg: 6, ang: 85, bkb: 30, kbg: 58 },
      ],
    },
    dair: {
      name: 'Dive Kick',
      total: 28,
      landLag: 8,
      anim: keys([0, A], [5, A, { lean: -10, t1: 40, s1: 30, t2: -20, s2: -40, a1: 160, f1: 170, a2: 140, f2: 150 }], [24, A, { lean: -10, t1: 40, s1: 30, t2: -20, s2: -40, a1: 160, f1: 170, a2: 140, f2: 150 }], [28, A]),
      hits: [{ f: [6, 18], at: 'foot1', r: 11, dmg: 7, ang: 60, bkb: 30, kbg: 45 }],
      vel: [{ f: 5, vx: 7, vy: -11 }],
      gravity: { f: [5, 18], mul: 0 },
    },
    nspec: {
      name: 'Phantom Orb',
      total: 28,
      anim: keys([0, S], [6, S, { lean: 10, a1: 160, f1: 170, a2: 150, f2: 160 }], [10, S, { lean: 30, a1: 92, f1: 90, a2: 85, f2: 88 }], [18, S, { lean: 30, a1: 92, f1: 90, a2: 85, f2: 88 }], [28, S]),
      proj: [{ f: 10, kind: 'orb', x: 40, y: 35, speed: 5, ang: 0, dmg: 6, hitAng: 45, bkb: 30, kbg: 42 }],
    },
    sspec: {
      name: 'Blink Strike',
      total: 30,
      turn: true,
      intangible: [2, 7],
      anim: keys([0, S], [3, S, { lean: 70, a1: 95, f1: 92, t1: 30, s1: 10, t2: -80, s2: -90 }], [14, S, { lean: 70, a1: 95, f1: 92, t1: 30, s1: 10, t2: -80, s2: -90 }], [30, S]),
      hits: [{ f: [6, 12], at: 'hand1', to: 'neck', r: 11, dmg: 7, ang: 35, bkb: 42, kbg: 45 }],
      vel: [
        { f: 3, vx: 17 },
        { f: 3, vy: 0, when: 'air' },
        { f: 14, vx: 3 },
      ],
      gravity: { f: [3, 14], mul: 0 },
    },
    uspec: {
      name: 'Phase Rise',
      total: 32,
      hidden: [3, 12],
      intangible: [3, 14],
      teleport: { f: 12, dist: 250 },
      anim: keys(
        [0, S],
        [3, crouch, { a1: 10, f1: 20 }],
        [12, crouch, { a1: 10, f1: 20 }],
        [14, A, { lean: -10, a1: 170, f1: 180, a2: 160, f2: 170, t1: 10, s1: -10, t2: -20, s2: -40 }],
        [32, A],
      ),
      hits: [{ f: [13, 16], at: [0, 40], r: 22, dmg: 5, ang: 80, bkb: 42, kbg: 42 }],
      vel: [{ f: 3, vx: 0, vy: 0 }],
      gravity: { f: [3, 16], mul: 0 },
    },
    dspec: {
      name: 'Recoil Kick',
      total: 28,
      anim: keys(
        [0, S],
        [3, S, { lean: 0, t1: 92, s1: 92, t2: -10, s2: -20, a1: -30, f1: -10, a2: -60, f2: -40 }],
        [8, S, { lean: 0, t1: 92, s1: 92, t2: -10, s2: -20, a1: -30, f1: -10, a2: -60, f2: -40 }],
        [12, A, { lean: 30 }],
        [28, S],
      ),
      hits: [{ f: [4, 7], at: 'foot1', r: 11, dmg: 8, ang: 40, bkb: 40, kbg: 86 }],
      vel: [
        { f: 9, vx: -10 },
        { f: 9, vy: 6 },
      ],
    },
  },
};
