import { pose } from '../skeleton';
import type { CharDef, HitDef } from '../types';
import { baseAnims, keys } from './common';

// VALKYRIE: aerial ace (Caleb). Four jumps (the jump from the ground and three
// in the air), aerials stronger than ground moves, poor ground mobility, great
// air mobility, a short sword with poor range, and an emphasis on vertical
// combos. A small build with wings (the wings are drawn, not part of the hurtbox).
//
// The ground moves are quick and short and pop opponents upward; the aerials do
// the damage and the finishing.

const S = pose({ lean: 8, a1: 35, f1: 100, w: 35, a2: -20, f2: 10, t1: 18, s1: -6, t2: -18, s2: -24 });
const A = pose(S, { t1: 45, s1: -15, t2: -10, s2: -40 });
const crouch = pose(S, { lean: 18, t1: 58, s1: -10, t2: 22, s2: -55 });

/** A sword hit: the tip hits harder, the blade a little less. */
function blade(f: [number, number], tip: Omit<HitDef, 'f' | 'at' | 'r'>, edge: Omit<HitDef, 'f' | 'at' | 'r'>, r: number): HitDef[] {
  return [
    { f, at: 'tip', r, ...tip },
    { f, at: 'hand1', to: 'tip', r: r - 3, ...edge },
  ];
}

export const valkyrie: CharDef = {
  id: 'valkyrie',
  name: 'Valkyrie',
  archetype: 'Aerial Ace',
  color: '#0b9db3',
  alt: '#0a6b78',
  body: { torso: 25, upper: 14, fore: 13, thigh: 18, shin: 18, head: 9, weapon: 28, torsoR: 7.5, limbR: 4.5 },
  line: 5.5,
  halfWidth: 13,
  height: 76,
  projLimit: 0,
  armorKb: 0,
  stats: {
    weight: 76,
    run: 4.5,
    groundAccel: 0.55,
    friction: 0.75,
    air: 5.8,
    airAccel: 0.78,
    airFriction: 0.1,
    gravity: 0.4,
    maxFall: 7.6,
    fastFall: 12,
    jump: 12,
    shortHop: 8.2,
    doubleJump: 10.5,
    airJumps: 3,
    squat: 4,
  },
  anims: baseAnims({
    stand: S,
    air: A,
    runLean: 12,
    runArms: [
      { a1: 20, f1: 90, a2: 60, f2: 110 },
      { a1: 50, f1: 110, a2: -30, f2: 20 },
    ],
    idleShift: { lean: 11, w: 28, dy: -1 },
  }),
  moves: {
    // ---- On the ground: quick, short, and they pop opponents up.
    jab: {
      name: 'Hilt Poke',
      total: 14,
      anim: keys([0, S], [2, S, { lean: 6, a1: 80, f1: 88, w: 0 }], [6, S, { lean: 6, a1: 80, f1: 88, w: 0 }], [14, S]),
      hits: blade([2, 4], { dmg: 3, ang: 80, bkb: 25, kbg: 15 }, { dmg: 2, ang: 80, bkb: 22, kbg: 12 }, 9),
    },
    ftilt: {
      name: 'Short Slash',
      total: 26,
      turn: true,
      anim: keys(
        [0, S],
        [5, S, { lean: -6, a1: 160, f1: 170, w: 10 }],
        [8, S, { lean: 8, a1: 95, f1: 85, w: 0 }],
        [11, S, { lean: 10, a1: 60, f1: 40, w: 0 }],
        [16, S, { lean: 10, a1: 60, f1: 40, w: 0 }],
        [26, S],
      ),
      hits: blade([7, 9], { dmg: 6, ang: 70, bkb: 35, kbg: 45 }, { dmg: 5, ang: 72, bkb: 32, kbg: 40 }, 10),
    },
    utilt: {
      name: 'Rising Cut',
      total: 24,
      anim: keys([0, S], [4, crouch, { a1: 20, f1: 30, w: 0 }], [7, S, { lean: -6, a1: 165, f1: 175, w: 5 }], [11, S, { lean: -6, a1: 165, f1: 175, w: 5 }], [24, S]),
      // Straight up with little growth: the start of a juggle.
      hits: blade([5, 9], { dmg: 6, ang: 90, bkb: 50, kbg: 28 }, { dmg: 5, ang: 92, bkb: 48, kbg: 25 }, 11),
    },
    dtilt: {
      name: 'Low Flick',
      total: 18,
      anim: keys([0, S], [4, crouch, { lean: 26, a1: 55, f1: 70, w: 0 }], [7, crouch, { lean: 28, a1: 85, f1: 95, w: 0 }], [10, crouch, { lean: 28, a1: 85, f1: 95, w: 0 }], [18, S]),
      hits: blade([5, 8], { dmg: 4, ang: 85, bkb: 40, kbg: 20 }, { dmg: 3, ang: 85, bkb: 38, kbg: 18 }, 9),
    },

    // ---- In the air: stronger than the ground moves.
    nair: {
      name: 'Wing Spin',
      total: 30,
      landLag: 8,
      anim: keys(
        [0, A],
        [3, A, { a1: 90, f1: 90, w: 0, t1: 70, s1: 40, t2: -60, s2: -70 }],
        [12, A, { a1: 90, f1: 90, w: 0, t1: 70, s1: 40, t2: -60, s2: -70, rot: 360 }],
        [30, A, { rot: 360 }],
      ),
      hits: [
        ...blade([4, 11], { dmg: 8, ang: 60, bkb: 30, kbg: 62, away: true }, { dmg: 7, ang: 60, bkb: 28, kbg: 55, away: true }, 13),
        { f: [4, 11], at: [0, 30], r: 22, dmg: 6, ang: 65, bkb: 28, kbg: 45, away: true },
      ],
    },
    fair: {
      name: 'Sky Cleave',
      total: 32,
      landLag: 11,
      turn: true,
      anim: keys(
        [0, A],
        [5, A, { lean: -10, a1: 170, f1: 175, w: 0 }],
        [9, A, { lean: 12, a1: 100, f1: 95, w: 0 }],
        [12, A, { lean: 20, a1: 45, f1: 35, w: 0 }],
        [18, A, { lean: 20, a1: 45, f1: 35, w: 0 }],
        [32, A],
      ),
      hits: blade([8, 12], { dmg: 11, ang: 42, bkb: 36, kbg: 80 }, { dmg: 9, ang: 45, bkb: 33, kbg: 72 }, 13),
    },
    uair: {
      name: 'Updraft Slash',
      total: 26,
      landLag: 6,
      anim: keys(
        [0, A],
        [3, A, { a1: 80, f1: 90, w: 0 }],
        [6, A, { a1: 150, f1: 165, w: 0 }],
        [9, A, { a1: 210, f1: 225, w: 0 }],
        [14, A, { a1: 210, f1: 225, w: 0 }],
        [26, A],
      ),
      // Sends straight up with moderate growth: with three air jumps, Valkyrie can follow and hit again.
      hits: blade([5, 10], { dmg: 8, ang: 88, bkb: 38, kbg: 52 }, { dmg: 7, ang: 90, bkb: 36, kbg: 48 }, 12),
    },
    dair: {
      name: 'Talon Stab',
      total: 34,
      landLag: 12,
      anim: keys(
        [0, A],
        [6, A, { lean: -5, a1: 160, f1: 170, w: 10, t1: 70, s1: 30 }],
        [9, A, { lean: 0, a1: 5, f1: 0, w: 0, t1: 40, s1: 10, t2: 20, s2: -10 }],
        [16, A, { lean: 0, a1: 5, f1: 0, w: 0, t1: 40, s1: 10, t2: 20, s2: -10 }],
        [34, A],
      ),
      // The tip spikes (sends straight down).
      hits: blade([9, 13], { dmg: 13, ang: -82, bkb: 30, kbg: 72 }, { dmg: 9, ang: 70, bkb: 30, kbg: 55 }, 12),
    },

    // ---- Specials.
    nspec: {
      name: 'Gale Burst',
      total: 30,
      anim: keys(
        [0, S],
        [5, S, { lean: -5, a1: 150, f1: 165, a2: 140, f2: 155, w: 0 }],
        [8, S, { lean: 6, a1: 60, f1: 70, a2: 50, f2: 60, w: 0 }],
        [14, S, { lean: 6, a1: 60, f1: 70, a2: 50, f2: 60, w: 0 }],
        [30, S],
      ),
      // A beat of the wings: pops anyone close straight up, and in the air Valkyrie hangs for a moment.
      hits: [{ f: [6, 9], at: [0, 35], r: 34, dmg: 5, ang: 90, bkb: 45, kbg: 20 }],
      vel: [{ f: 1, vy: 0, when: 'air' }],
      gravity: { f: [1, 16], mul: 0.15 },
    },
    sspec: {
      name: 'Wing Dash',
      total: 32,
      turn: true,
      anim: keys([0, S], [3, S, { lean: 60, a1: 90, f1: 90, w: 0, t1: 30, s1: 10, t2: -70, s2: -80 }], [14, S, { lean: 60, a1: 90, f1: 90, w: 0, t1: 30, s1: 10, t2: -70, s2: -80 }], [32, S]),
      hits: blade([6, 12], { dmg: 8, ang: 45, bkb: 40, kbg: 50 }, { dmg: 6, ang: 50, bkb: 35, kbg: 40 }, 11),
      vel: [
        { f: 3, vx: 14 },
        { f: 3, vy: 0, when: 'air' },
        { f: 14, vx: 4 },
      ],
      gravity: { f: [3, 14], mul: 0 },
    },
    uspec: {
      name: 'Ascent',
      total: 42,
      drift: 1,
      anim: keys(
        [0, S],
        [5, crouch, { a1: 40, f1: 60, w: 0 }],
        [7, S, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40 }],
        [24, S, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40 }],
        [42, A],
      ),
      // Several small hits on the way up, then a launcher straight up.
      hits: [
        { f: [7, 16], at: 'tip', r: 13, dmg: 2, ang: 85, bkb: 30, kbg: 8, rehit: 5, group: 0 },
        { f: [7, 16], at: 'hand1', to: 'tip', r: 9, dmg: 2, ang: 85, bkb: 30, kbg: 8, rehit: 5, group: 0 },
        { f: [17, 20], at: 'tip', r: 15, dmg: 6, ang: 88, bkb: 52, kbg: 76, group: 1 },
        { f: [17, 20], at: 'hand1', to: 'tip', r: 11, dmg: 5, ang: 88, bkb: 50, kbg: 70, group: 1 },
      ],
      vel: [{ f: 6, vx: 1.5, vy: 13 }],
    },
    dspec: {
      name: 'Spear Dive',
      total: 12,
      untilLand: 10,
      onLand: 'dspecLand',
      anim: keys(
        [0, S],
        [6, A, { t1: 90, s1: 60, t2: 80, s2: 50, a1: 160, f1: 175, w: 0 }],
        [10, A, { lean: 0, t1: 5, s1: 0, t2: 10, s2: 5, a1: 2, f1: 0, w: 0 }],
        [12, A],
      ),
      // Sword first, straight down: the tip spikes in the air.
      hits: blade([10, 10], { dmg: 8, ang: -85, bkb: 30, kbg: 60 }, { dmg: 6, ang: 70, bkb: 28, kbg: 45 }, 12),
      vel: [
        { f: 4, vy: 8, when: 'ground' },
        { f: 10, vx: 0, vy: -16 },
      ],
    },
    dspecLand: {
      name: 'Spear Dive (landing)',
      total: 20,
      anim: keys([0, crouch, { a1: 30, f1: 40, w: 0 }], [20, S]),
      // Landing pops nearby opponents straight up.
      hits: [
        { f: [0, 2], at: [28, 5], r: 22, dmg: 4, ang: 85, bkb: 50, kbg: 30, away: true },
        { f: [0, 2], at: [-28, 5], r: 22, dmg: 4, ang: 85, bkb: 50, kbg: 30, away: true },
      ],
    },
  },
};
