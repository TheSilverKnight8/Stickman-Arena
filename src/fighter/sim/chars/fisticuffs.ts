import { pose } from '../skeleton';
import type { CharDef } from '../types';
import { baseAnims, keys } from './common';

// FISTICUFFS: rushdown. Good mobility and aggressive tools; light, with a poor
// neutral. Short range, punchy, has combos (spec).

const S = pose({ lean: 10, a1: 40, f1: 150, a2: 25, f2: 140, t1: 18, s1: -5, t2: -20, s2: -20 });
const A = pose({ lean: 10, a1: 100, f1: 140, a2: 60, f2: 120, t1: 40, s1: -20, t2: -20, s2: -40 });
const crouch = pose(S, { lean: 20, t1: 60, s1: -10, t2: 20, s2: -60 });

export const fisticuffs: CharDef = {
  id: 'fisticuffs',
  name: 'Fisticuffs',
  archetype: 'Rushdown',
  color: '#e8352f',
  alt: '#ff8a65',
  body: { torso: 28, upper: 15, fore: 15, thigh: 20, shin: 20, head: 10, weapon: 0, torsoR: 8.5, limbR: 5 },
  line: 6,
  halfWidth: 15,
  height: 86,
  projLimit: 0,
  armorKb: 0,
  stats: {
    weight: 85,
    run: 7.2,
    groundAccel: 1.1,
    friction: 0.9,
    air: 4.8,
    airAccel: 0.55,
    airFriction: 0.1,
    gravity: 0.62,
    maxFall: 10.5,
    fastFall: 15,
    jump: 14.2,
    shortHop: 9.6,
    doubleJump: 13,
    squat: 4,
  },
  anims: baseAnims({ stand: S, air: A, runLean: 22, idleShift: { t1: 26, s1: -16, t2: -12, s2: -32, dy: -2 }, idleFrames: 30 }),
  moves: {
    jab: {
      name: 'One-Two (first punch)',
      total: 16,
      anim: keys([0, S], [2, S, { lean: 16, a1: 70, f1: 95 }], [4, S, { lean: 22, a1: 88, f1: 90, a2: 20, f2: 150 }], [9, S, { lean: 22, a1: 88, f1: 90, a2: 20, f2: 150 }], [16, S]),
      hits: [{ f: [3, 5], at: 'hand1', r: 9, dmg: 3, ang: 70, bkb: 18, kbg: 15 }],
      chain: { into: 'jab2', window: [5, 15] },
    },
    jab2: {
      name: 'One-Two (second punch)',
      total: 22,
      anim: keys([0, S, { lean: 22, a1: 88, f1: 90 }], [2, S, { lean: 18, a2: 60, f2: 100 }], [4, S, { lean: 28, a1: 30, f1: 140, a2: 90, f2: 90, t1: 30 }], [10, S, { lean: 28, a1: 30, f1: 140, a2: 90, f2: 90, t1: 30 }], [22, S]),
      hits: [{ f: [4, 6], at: 'hand2', r: 10, dmg: 4, ang: 38, bkb: 30, kbg: 55 }],
      vel: [{ f: 3, vx: 2.5, add: true, when: 'ground' }],
    },
    ftilt: {
      name: 'Straight Punch',
      total: 28,
      turn: true,
      anim: keys(
        [0, S],
        [5, S, { lean: 0, a1: -20, f1: 30, t1: 25, s1: -10, t2: -25, s2: -30 }],
        [8, S, { lean: 28, a1: 90, f1: 90, a2: 20, f2: 140, t1: 45, s1: 0, t2: -40, s2: -40 }],
        [13, S, { lean: 28, a1: 90, f1: 90, a2: 20, f2: 140, t1: 45, s1: 0, t2: -40, s2: -40 }],
        [28, S],
      ),
      hits: [{ f: [8, 10], at: 'hand1', r: 11, dmg: 8, ang: 38, bkb: 35, kbg: 95 }],
      vel: [{ f: 7, vx: 5, when: 'ground' }],
    },
    utilt: {
      name: 'Uppercut',
      total: 24,
      anim: keys([0, S], [4, crouch, { a1: 20, f1: 40 }], [7, S, { lean: -5, a1: 170, f1: 178, t1: 10, s1: 0, t2: -15, s2: -20 }], [12, S, { lean: -5, a1: 170, f1: 178, t1: 10, s1: 0, t2: -15, s2: -20 }], [24, S]),
      hits: [{ f: [6, 9], at: 'hand1', r: 11, dmg: 6, ang: 88, bkb: 50, kbg: 50 }],
    },
    dtilt: {
      name: 'Low Sweep',
      total: 20,
      anim: keys(
        [0, S],
        [4, S, { lean: 30, t1: 70, s1: 40, t2: 30, s2: -60, a1: 70, f1: 120, a2: -20, f2: 0 }],
        [6, S, { lean: 35, t1: 88, s1: 92, t2: 40, s2: -50, a1: 70, f1: 120, a2: -20, f2: 0 }],
        [10, S, { lean: 35, t1: 88, s1: 92, t2: 40, s2: -50, a1: 70, f1: 120, a2: -20, f2: 0 }],
        [20, S],
      ),
      hits: [{ f: [5, 8], at: 'foot1', r: 10, dmg: 5, ang: 78, bkb: 45, kbg: 40 }],
    },
    nair: {
      name: 'Spin Kick',
      total: 30,
      landLag: 7,
      anim: keys(
        [0, A],
        [4, A, { t1: 90, s1: 90, t2: -90, s2: -90, a1: 160, f1: 170, a2: 20, f2: 0 }],
        [14, A, { t1: 90, s1: 90, t2: -90, s2: -90, a1: 160, f1: 170, a2: 20, f2: 0, rot: -360 }],
        [30, A, { rot: -360 }],
      ),
      hits: [
        { f: [4, 7], at: 'foot1', r: 10, dmg: 8, ang: 45, bkb: 30, kbg: 80 },
        { f: [4, 7], at: 'foot2', r: 10, dmg: 8, ang: 45, bkb: 30, kbg: 80, away: true },
        { f: [8, 14], at: 'foot1', r: 9, dmg: 5, ang: 50, bkb: 20, kbg: 60, away: true },
        { f: [8, 14], at: 'foot2', r: 9, dmg: 5, ang: 50, bkb: 20, kbg: 60, away: true },
      ],
    },
    fair: {
      name: 'Double Jab',
      total: 30,
      landLag: 9,
      turn: true,
      anim: keys(
        [0, A],
        [4, A, { lean: 25, a1: 95, f1: 90, a2: 30, f2: 130, t1: 50, s1: 0, t2: -10, s2: -50 }],
        [7, A, { lean: 25, a1: 40, f1: 140, a2: 40, f2: 120, t1: 50, s1: 0, t2: -10, s2: -50 }],
        [9, A, { lean: 28, a1: 40, f1: 140, a2: 95, f2: 90, t1: 50, s1: 0, t2: -10, s2: -50 }],
        [14, A, { lean: 28, a1: 40, f1: 140, a2: 95, f2: 90, t1: 50, s1: 0, t2: -10, s2: -50 }],
        [30, A],
      ),
      hits: [
        { f: [4, 6], at: 'hand1', r: 10, dmg: 4, ang: 60, bkb: 25, kbg: 20, group: 0 },
        { f: [9, 11], at: 'hand2', r: 11, dmg: 6, ang: 40, bkb: 35, kbg: 75, group: 1 },
      ],
    },
    uair: {
      name: 'Flip Kick',
      total: 28,
      landLag: 8,
      anim: keys(
        [0, A],
        [4, A, { lean: 0, t1: 100, s1: 120, t2: 0, s2: -10, a1: 60, f1: 90, a2: -60, f2: -90 }],
        [12, A, { lean: 0, t1: 100, s1: 120, t2: 0, s2: -10, a1: 60, f1: 90, a2: -60, f2: -90, rot: 300 }],
        [20, A, { rot: 360 }],
        [28, A, { rot: 360 }],
      ),
      hits: [{ f: [6, 11], at: 'foot1', r: 11, dmg: 7, ang: 88, bkb: 35, kbg: 80 }],
    },
    dair: {
      name: 'Stomp',
      total: 36,
      landLag: 14,
      anim: keys(
        [0, A],
        [8, A, { lean: -5, t1: 70, s1: 70, t2: 50, s2: 40, a1: 140, f1: 170, a2: 120, f2: 160 }],
        [11, A, { lean: 5, t1: 5, s1: 0, t2: 10, s2: 5, a1: 120, f1: 150, a2: 110, f2: 140 }],
        [18, A, { lean: 5, t1: 5, s1: 0, t2: 10, s2: 5, a1: 120, f1: 150, a2: 110, f2: 140 }],
        [36, A],
      ),
      hits: [
        { f: [11, 12], at: 'foot1', r: 11, dmg: 10, ang: -88, bkb: 25, kbg: 70 },
        { f: [11, 12], at: 'foot2', r: 11, dmg: 10, ang: -88, bkb: 25, kbg: 70 },
        { f: [13, 17], at: 'foot1', r: 9, dmg: 6, ang: 60, bkb: 25, kbg: 50 },
      ],
    },
    nspec: {
      name: 'Haymaker',
      total: 48,
      anim: keys(
        [0, S],
        [16, S, { lean: -15, a1: -110, f1: -60, a2: 60, f2: 140, t1: 30, s1: 0, t2: -30, s2: -30 }],
        [19, S, { lean: 30, a1: 85, f1: 88, a2: 0, f2: -30, t1: 50, s1: 10, t2: -45, s2: -45 }],
        [26, S, { lean: 30, a1: 85, f1: 88, a2: 0, f2: -30, t1: 50, s1: 10, t2: -45, s2: -45 }],
        [48, S],
      ),
      hits: [{ f: [18, 21], at: 'hand1', r: 13, dmg: 16, ang: 40, bkb: 40, kbg: 88 }],
      vel: [{ f: 17, vx: 4 }],
    },
    sspec: {
      name: 'Dash Punch',
      total: 36,
      turn: true,
      stopOnHit: true,
      anim: keys(
        [0, S],
        [5, S, { lean: 30, a1: -40, f1: -20, a2: 40, f2: 120, t1: 40, s1: -10, t2: -30, s2: -40 }],
        [8, S, { lean: 45, a1: 90, f1: 90, a2: -40, f2: -20, t1: 60, s1: 30, t2: -60, s2: -60 }],
        [22, S, { lean: 45, a1: 90, f1: 90, a2: -40, f2: -20, t1: 60, s1: 30, t2: -60, s2: -60 }],
        [36, S],
      ),
      hits: [{ f: [8, 18], at: 'hand1', r: 12, dmg: 9, ang: 40, bkb: 45, kbg: 60 }],
      vel: [
        { f: 7, vx: 15 },
        { f: 7, vy: 2, when: 'air' },
        { f: 20, vx: 4 },
      ],
      gravity: { f: [7, 20], mul: 0.3 },
    },
    uspec: {
      name: 'Rising Uppercut',
      total: 42,
      drift: 1,
      anim: keys(
        [0, S],
        [4, crouch, { a1: 20, f1: 40 }],
        [6, S, { lean: -5, a1: 175, f1: 180, t1: 20, s1: -20, t2: -30, s2: -60 }],
        [22, S, { lean: -5, a1: 175, f1: 180, t1: 20, s1: -20, t2: -30, s2: -60, rot: -360 }],
        [42, A, { rot: -360 }],
      ),
      hits: [
        { f: [6, 18], at: 'hand1', r: 12, dmg: 2, ang: 85, bkb: 35, kbg: 5, rehit: 4, group: 0 },
        { f: [19, 22], at: 'hand1', r: 14, dmg: 5, ang: 80, bkb: 55, kbg: 80, group: 1 },
      ],
      vel: [{ f: 5, vx: 1.5, vy: 17 }],
    },
    dspec: {
      name: 'Stomp Drop',
      total: 12,
      untilLand: 10,
      onLand: 'dspecLand',
      anim: keys([0, S], [6, A, { t1: 95, s1: 60, t2: 80, s2: 50, a1: 150, f1: 170, a2: 140, f2: 160 }], [10, A, { lean: 0, t1: 0, s1: 0, t2: 5, s2: 0, a1: 160, f1: 175, a2: 150, f2: 170 }], [12, A]),
      hits: [{ f: [10, 10], at: 'foot1', r: 12, dmg: 9, ang: -80, bkb: 30, kbg: 60 }],
      vel: [
        { f: 4, vy: 9, when: 'ground' },
        { f: 10, vx: 0, vy: -17 },
      ],
    },
    dspecLand: {
      name: 'Stomp Drop (landing)',
      total: 18,
      anim: keys([0, crouch, { a1: 120, f1: 150 }], [18, S]),
      hits: [
        { f: [0, 2], at: [30, 5], r: 18, dmg: 6, ang: 80, bkb: 55, kbg: 35, away: true },
        { f: [0, 2], at: [-30, 5], r: 18, dmg: 6, ang: 80, bkb: 55, kbg: 35, away: true },
      ],
    },
  },
};
