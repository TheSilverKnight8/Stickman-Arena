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
    gravity: 0.53,
    maxFall: 9.5,
    fastFall: 15,
    jump: 13.6,
    shortHop: 9.2,
    doubleJump: 12.5,
    squat: 4,
  },
  anims: baseAnims({ stand: S, air: A, runLean: 22, idleShift: { t1: 26, s1: -16, t2: -12, s2: -32, dy: -2 }, idleFrames: 30 }),
  moves: {
    jab: {
      name: 'One-Two (first punch)',
      total: 16,
      prio: 1,
      anim: keys(
        [0, S],
        [2, S, { lean: 16, a1: 70, f1: 95, t1: 26, t2: -26, dx: 2 }],
        [4, S, { lean: 22, a1: 88, f1: 90, a2: 20, f2: 150, t1: 32, s1: -4, t2: -30, s2: -26, dx: 4 }],
        [9, S, { lean: 22, a1: 88, f1: 90, a2: 20, f2: 150, t1: 32, s1: -4, t2: -30, s2: -26, dx: 4 }],
        [16, S],
      ),
      hits: [{ f: [3, 6], at: 'hand1', r: 14, dmg: 4, ang: 70, bkb: 15, kbg: 10 }],
      chain: { into: 'jab2', window: [5, 15] },
    },
    jab2: {
      name: 'One-Two (second punch)',
      total: 22,
      prio: 1,
      anim: keys(
        [0, S, { lean: 22, a1: 88, f1: 90, dx: 4 }],
        [2, S, { lean: 14, a2: 60, f2: 100, dx: 2, t1: 20, t2: -30 }],
        [4, S, { lean: 30, a1: 30, f1: 140, a2: 90, f2: 90, t1: 40, s1: 0, t2: -36, s2: -30, dx: 6 }],
        [10, S, { lean: 30, a1: 30, f1: 140, a2: 90, f2: 90, t1: 40, s1: 0, t2: -36, s2: -30, dx: 6 }],
        [22, S],
      ),
      hits: [{ f: [4, 7], at: 'hand2', r: 15, dmg: 6, ang: 38, bkb: 26, kbg: 34 }],
      vel: [{ f: 3, vx: 2.5, add: true, when: 'ground' }],
    },
    ftilt: {
      name: 'Straight Punch',
      total: 28,
      prio: 2,
      turn: true,
      anim: keys(
        [0, S],
        [5, S, { lean: -4, a1: -20, f1: 30, t1: 25, s1: -10, t2: -25, s2: -30, dx: -3 }],
        [8, S, { lean: 30, a1: 90, f1: 90, a2: 20, f2: 140, t1: 48, s1: 2, t2: -42, s2: -42 }],
        [13, S, { lean: 30, a1: 90, f1: 90, a2: 20, f2: 140, t1: 48, s1: 2, t2: -42, s2: -42 }],
        [28, S],
      ),
      hits: [{ f: [8, 12], at: 'hand1', r: 16, dmg: 8, ang: 38, bkb: 35, kbg: 95 }],
      vel: [{ f: 7, vx: 5, when: 'ground' }],
    },
    utilt: {
      // Dips, steps in and swings the fist up from low in front to overhead: reaches further forward
      // than before, and pops opponents up to just above him (pulled in a little).
      name: 'Uppercut',
      total: 24,
      prio: 2,
      anim: keys(
        [0, S],
        [3, crouch, { lean: 30, a1: 30, f1: 60, a2: 40, f2: 130, dx: -2 }],
        [5, crouch, { lean: 26, a1: 85, f1: 110, a2: 30, f2: 120, dx: 6 }],
        [7, S, { lean: 6, a1: 135, f1: 160, t1: 30, s1: 0, t2: -24, s2: -24, dx: 8 }],
        [9, S, { lean: -8, a1: 172, f1: 180, t1: 12, s1: 0, t2: -16, s2: -20, dx: 6, dy: 4 }],
        [13, S, { lean: -8, a1: 172, f1: 180, t1: 12, s1: 0, t2: -16, s2: -20, dx: 6, dy: 4 }],
        [24, S],
      ),
      hits: [
        { f: [5, 10], at: 'hand1', r: 16, dmg: 8, ang: 84, bkb: 46, kbg: 30, pull: true },
        { f: [5, 7], at: 'elbow1', to: 'hand1', r: 12, dmg: 8, ang: 84, bkb: 46, kbg: 30, pull: true },
      ],
    },
    dtilt: {
      name: 'Low Sweep',
      total: 20,
      prio: 1,
      anim: keys(
        [0, S],
        [4, S, { lean: 30, t1: 70, s1: 40, t2: 30, s2: -60, a1: 70, f1: 120, a2: -20, f2: 0, dy: -6 }],
        [6, S, { lean: 35, t1: 88, s1: 92, t2: 40, s2: -50, a1: 70, f1: 120, a2: -20, f2: 0, dy: -8 }],
        [10, S, { lean: 35, t1: 88, s1: 92, t2: 40, s2: -50, a1: 70, f1: 120, a2: -20, f2: 0, dy: -8 }],
        [20, S],
      ),
      hits: [{ f: [5, 9], at: 'foot1', r: 15, dmg: 7, ang: 78, bkb: 39, kbg: 25 }],
    },
    nair: {
      // A sex kick: one leg snaps straight out and stays there. Strong as it comes out, weaker as it lingers.
      name: 'Flying Kick',
      total: 30,
      landLag: 6,
      prio: 2,
      anim: keys(
        [0, A],
        [2, A, { lean: -4, t1: 80, s1: -20, t2: 20, s2: -60, a1: 130, f1: 160, a2: 60, f2: 140 }],
        [3, A, { lean: -16, t1: 92, s1: 94, t2: 30, s2: -70, a1: 140, f1: 170, a2: 40, f2: 120 }],
        [20, A, { lean: -18, t1: 90, s1: 92, t2: 32, s2: -70, a1: 140, f1: 170, a2: 40, f2: 120 }],
        [30, A],
      ),
      hits: [
        { f: [3, 5], at: 'foot1', r: 15, dmg: 9, ang: 40, bkb: 32, kbg: 80 },
        { f: [6, 20], at: 'foot1', r: 14, dmg: 5, ang: 45, bkb: 25, kbg: 50, prio: 1 },
      ],
    },
    fair: {
      // A flurry of kicks out in front, then a last kick that launches upward. Longer reach than the old punches.
      name: 'Kick Flurry',
      total: 32,
      landLag: 9,
      prio: 1,
      turn: true,
      anim: keys(
        [0, A],
        [3, A, { lean: -14, t1: 50, s1: -10, t2: 20, s2: -40, a1: 120, f1: 160, a2: 70, f2: 140 }],
        [5, A, { lean: -18, t1: 92, s1: 90, t2: 30, s2: -30 }],
        [7, A, { lean: -18, t1: 40, s1: -20, t2: 92, s2: 88 }],
        [9, A, { lean: -18, t1: 92, s1: 90, t2: 30, s2: -30 }],
        [11, A, { lean: -18, t1: 40, s1: -20, t2: 92, s2: 88 }],
        [13, A, { lean: -18, t1: 92, s1: 90, t2: 30, s2: -30 }],
        [15, A, { lean: -10, t1: 50, s1: 0, t2: 20, s2: -40 }],
        [17, A, { lean: -26, t1: 125, s1: 130, t2: 10, s2: -40 }],
        [21, A, { lean: -26, t1: 125, s1: 130, t2: 10, s2: -40 }],
        [32, A],
      ),
      hits: [
        { f: [5, 14], at: 'foot1', r: 15, dmg: 2, ang: 65, bkb: 22, kbg: 5, rehit: 3, group: 0 },
        { f: [5, 14], at: 'foot2', r: 15, dmg: 2, ang: 65, bkb: 22, kbg: 5, rehit: 3, group: 0 },
        { f: [17, 19], at: 'foot1', r: 17, dmg: 6, ang: 72, bkb: 40, kbg: 70, group: 1, prio: 2 },
      ],
    },
    uair: {
      // A kick straight up: leans back and snaps one leg overhead.
      name: 'Sky Kick',
      total: 28,
      landLag: 7,
      prio: 2,
      anim: keys(
        [0, A],
        [3, A, { lean: -10, t1: 110, s1: 60, t2: -10, s2: -40, a1: 60, f1: 90, a2: -40, f2: -60 }],
        [5, A, { lean: -28, t1: 172, s1: 178, t2: -20, s2: -40, a1: 50, f1: 80, a2: -60, f2: -80 }],
        [10, A, { lean: -28, t1: 172, s1: 178, t2: -20, s2: -40, a1: 50, f1: 80, a2: -60, f2: -80 }],
        [28, A],
      ),
      hits: [
        { f: [5, 9], at: 'foot1', r: 16, dmg: 9, ang: 90, bkb: 32, kbg: 55 },
        { f: [5, 9], at: 'knee1', to: 'foot1', r: 12, dmg: 7, ang: 88, bkb: 30, kbg: 45 },
      ],
    },
    dair: {
      // Punches straight down. The fist spikes; the arm knocks away.
      name: 'Spike Punch',
      total: 34,
      landLag: 13,
      prio: 2,
      anim: keys(
        [0, A],
        [6, A, { lean: -10, a1: 150, f1: 170, a2: 120, f2: 150, t1: 70, s1: 10, t2: 40, s2: -20 }],
        [9, A, { lean: 10, a1: 2, f1: 0, a2: 60, f2: 100, t1: 30, s1: -30, t2: -10, s2: -60 }],
        [15, A, { lean: 10, a1: 2, f1: 0, a2: 60, f2: 100, t1: 30, s1: -30, t2: -10, s2: -60 }],
        [34, A],
      ),
      hits: [
        { f: [9, 11], at: 'hand1', r: 16, dmg: 10, ang: -85, bkb: 25, kbg: 70 },
        { f: [12, 15], at: 'hand1', r: 14, dmg: 6, ang: 60, bkb: 25, kbg: 50, prio: 1 },
      ],
    },
    nspec: {
      // Winds up and throws a heavy punch; the fist catches fire (drawn only).
      name: 'Haymaker',
      total: 48,
      prio: 3,
      anim: keys(
        [0, S],
        [16, S, { lean: -18, a1: -110, f1: -60, a2: 60, f2: 140, t1: 30, s1: 0, t2: -30, s2: -30, dx: -6, dy: -3 }],
        [19, S, { lean: 34, a1: 85, f1: 88, a2: 0, f2: -30, t1: 55, s1: 10, t2: -48, s2: -48, dx: 4, dy: -4 }],
        [26, S, { lean: 34, a1: 85, f1: 88, a2: 0, f2: -30, t1: 55, s1: 10, t2: -48, s2: -48, dx: 4, dy: -4 }],
        [48, S],
      ),
      hits: [{ f: [18, 22], at: 'hand1', r: 18, dmg: 16, ang: 40, bkb: 40, kbg: 88 }],
      vel: [{ f: 17, vx: 4 }],
    },
    sspec: {
      name: 'Dash Punch',
      total: 36,
      prio: 2,
      turn: true,
      stopOnHit: true,
      anim: keys(
        [0, S],
        [5, S, { lean: 30, a1: -40, f1: -20, a2: 40, f2: 120, t1: 40, s1: -10, t2: -30, s2: -40 }],
        [8, S, { lean: 45, a1: 90, f1: 90, a2: -40, f2: -20, t1: 60, s1: 30, t2: -60, s2: -60 }],
        [22, S, { lean: 45, a1: 90, f1: 90, a2: -40, f2: -20, t1: 60, s1: 30, t2: -60, s2: -60 }],
        [36, S],
      ),
      hits: [{ f: [8, 18], at: 'hand1', r: 17, dmg: 9, ang: 40, bkb: 45, kbg: 60 }],
      vel: [
        { f: 7, vx: 15 },
        { f: 7, vy: 2, when: 'air' },
        { f: 20, vx: 4 },
      ],
      gravity: { f: [7, 20], mul: 0.3 },
    },
    uspec: {
      // A strong jumping uppercut: the fist hits hardest as it leaves the ground.
      name: 'Jumping Uppercut',
      total: 42,
      prio: 2,
      drift: 1,
      anim: keys(
        [0, S],
        [3, crouch, { lean: 30, a1: 20, f1: 40, dy: -4 }],
        [5, S, { lean: 4, a1: 120, f1: 150, t1: 30, s1: -10, t2: -30, s2: -60, dx: 4 }],
        [9, S, { lean: -10, a1: 175, f1: 180, a2: 60, f2: 120, t1: 70, s1: 0, t2: -30, s2: -60 }],
        [16, S, { lean: -10, a1: 175, f1: 180, a2: 60, f2: 120, t1: 70, s1: 0, t2: -30, s2: -60 }],
        [42, A],
      ),
      hits: [
        { f: [5, 8], at: 'hand1', r: 18, dmg: 11, ang: 80, bkb: 44, kbg: 74, group: 0 },
        { f: [5, 8], at: 'elbow1', to: 'hand1', r: 14, dmg: 9, ang: 80, bkb: 40, kbg: 68, group: 0 },
        { f: [9, 16], at: 'hand1', r: 16, dmg: 5, ang: 85, bkb: 40, kbg: 40, group: 0 },
      ],
      vel: [{ f: 5, vx: 1.5, vy: 15.6 }],
    },
    dspec: {
      name: 'Stomp Drop',
      total: 12,
      prio: 2,
      untilLand: 10,
      onLand: 'dspecLand',
      anim: keys([0, S], [6, A, { t1: 95, s1: 60, t2: 80, s2: 50, a1: 150, f1: 170, a2: 140, f2: 160 }], [10, A, { lean: 0, t1: 0, s1: 0, t2: 5, s2: 0, a1: 160, f1: 175, a2: 150, f2: 170 }], [12, A]),
      hits: [{ f: [10, 10], at: 'foot1', r: 17, dmg: 9, ang: -80, bkb: 30, kbg: 60 }],
      vel: [
        { f: 4, vy: 9, when: 'ground' },
        { f: 10, vx: 0, vy: -17 },
      ],
    },
    dspecLand: {
      name: 'Stomp Drop (landing)',
      total: 18,
      prio: 1,
      anim: keys([0, crouch, { a1: 120, f1: 150, lean: 30 }], [18, S]),
      hits: [
        { f: [0, 2], at: [30, 5], r: 23, dmg: 6, ang: 80, bkb: 55, kbg: 35, away: true },
        { f: [0, 2], at: [-30, 5], r: 23, dmg: 6, ang: 80, bkb: 55, kbg: 35, away: true },
      ],
    },
  },
};
