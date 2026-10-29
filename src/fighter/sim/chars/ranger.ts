import { pose } from '../skeleton';
import type { CharDef, ProjSpawn } from '../types';
import { aimPose, baseAnims, keys } from './common';

// RANGER: zoner. Average mobility and survivability, plenty of ranged tools;
// less effective close up, needs precision. An archer with many bow attacks,
// plus an answer to close opponents (spec): Bow Bash, Back-off Kick and
// Backflip Kick push them away. She wears a wide-brimmed hat and a quiver (drawn only).

const S = pose({ lean: 4, a1: 70, f1: 80, a2: 20, f2: 60, t1: 14, s1: -2, t2: -14, s2: -16 });
const A = pose(S, { t1: 40, s1: -20, t2: -10, s2: -40, a1: 95, f1: 100 });

/** Arrows push but stun only briefly: the hit leaves 40% of the usual hitstun. */
const ARROW_HITSTUN = 0.4;

/** One arrow. `ang` is the aim: 0 forward, 90 up, -90 down. */
function arrow(f: number, x: number, y: number, ang: number, dmg = 5, extra: Partial<ProjSpawn> = {}): ProjSpawn {
  return { f, kind: 'arrow', x, y, speed: 17, ang, dmg, hitAng: ang > 60 ? 88 : 40, bkb: 26, kbg: 42, hitstun: ARROW_HITSTUN, ...extra };
}

export const ranger: CharDef = {
  id: 'ranger',
  name: 'Ranger',
  archetype: 'Zoner',
  color: '#2f9e44',
  alt: '#8ccf4e',
  body: { torso: 30, upper: 17, fore: 16, thigh: 21, shin: 21, head: 10, weapon: 0, torsoR: 9, limbR: 5 },
  line: 6,
  halfWidth: 16,
  height: 90,
  projLimit: 5,
  armorKb: 0,
  stats: {
    weight: 98,
    run: 6.0,
    groundAccel: 0.9,
    friction: 0.85,
    air: 4.2,
    airAccel: 0.45,
    airFriction: 0.08,
    gravity: 0.47,
    maxFall: 8.6,
    fastFall: 14,
    jump: 13,
    shortHop: 8.7,
    doubleJump: 12,
    squat: 4,
  },
  anims: baseAnims({
    stand: S,
    air: A,
    runArms: [
      { a1: 40, f1: 70, a2: 60, f2: 120 },
      { a1: 70, f1: 90, a2: -35, f2: 30 },
    ],
    idleShift: { a1: 66, f1: 76, lean: 6, dy: -1 },
  }),
  moves: {
    jab: {
      name: 'Bow Bash',
      total: 18,
      prio: 1,
      anim: keys(
        [0, S],
        [3, S, { a1: 20, f1: 40, lean: -8, t1: 8, t2: -20, dx: -2 }],
        [5, S, { a1: 110, f1: 140, lean: 18, t1: 34, s1: 0, t2: -26, s2: -30, dx: 4 }],
        [9, S, { a1: 110, f1: 140, lean: 18, t1: 34, s1: 0, t2: -26, s2: -30, dx: 4 }],
        [18, S],
      ),
      hits: [{ f: [4, 6], at: 'hand1', r: 13, dmg: 4, ang: 55, bkb: 40, kbg: 45 }],
    },
    ftilt: {
      name: 'Quick Shot',
      total: 34,
      prio: 2,
      turn: true,
      // Plants a wide stance to shoot, and rocks back with the release.
      anim: [
        [0, S],
        [6, aimPose(S, 90, { t1: 30, s1: 0, t2: -30, s2: -30, dy: -3 })],
        [11, aimPose(S, 90, { lean: -6, t1: 30, s1: 0, t2: -30, s2: -30, dy: -3, dx: -4 })],
        [18, aimPose(S, 90, { t1: 26, s1: -2, t2: -26, s2: -28, dy: -2, dx: -3 })],
        [34, S],
      ],
      proj: [arrow(10, 34, 30, 0, 6, { hitAng: 38, bkb: 28, kbg: 45 })],
    },
    utilt: {
      name: 'Skyward Shot',
      total: 34,
      prio: 2,
      // Leans back with one knee bent to aim straight up.
      anim: [
        [0, S],
        [6, aimPose(S, 175, { lean: -14, t1: 40, s1: -20, t2: -20, s2: -30, dy: -4 })],
        [11, aimPose(S, 175, { lean: -18, t1: 40, s1: -20, t2: -20, s2: -30, dy: -5 })],
        [18, aimPose(S, 175, { lean: -14, t1: 36, s1: -18, t2: -18, s2: -28, dy: -4 })],
        [34, S],
      ],
      proj: [arrow(9, 6, 72, 85, 6, { hitAng: 88, bkb: 30, kbg: 62 })],
    },
    dtilt: {
      name: 'Back-off Kick',
      total: 24,
      prio: 1,
      anim: keys(
        [0, S],
        [2, S, { lean: 10, t1: 50, s1: -40, t2: -16, s2: -22, a1: 80, f1: 100, dy: -3 }],
        [4, S, { lean: -24, t1: 70, s1: 85, t2: -10, s2: -20, a1: 120, f1: 140, a2: -40, f2: -20 }],
        [8, S, { lean: -24, t1: 70, s1: 85, t2: -10, s2: -20, a1: 120, f1: 140, a2: -40, f2: -20 }],
        [24, S],
      ),
      hits: [{ f: [4, 7], at: 'foot1', r: 11, dmg: 6, ang: 28, bkb: 58, kbg: 45 }],
      vel: [{ f: 7, vx: -5, when: 'ground' }],
    },
    nair: {
      name: 'Bow Spin',
      total: 28,
      landLag: 7,
      prio: 1,
      anim: keys(
        [0, A],
        [4, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 70, s1: 20, t2: -60, s2: -80 }],
        [12, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 70, s1: 20, t2: -60, s2: -80, rot: 360 }],
        [28, A, { rot: 360 }],
      ),
      hits: [
        { f: [5, 12], at: 'hand1', r: 14, dmg: 6, ang: 45, bkb: 35, kbg: 55, away: true },
        { f: [5, 12], at: 'hand2', r: 10, dmg: 6, ang: 45, bkb: 35, kbg: 55, away: true },
      ],
    },
    fair: {
      name: 'Air Shot',
      total: 36,
      landLag: 8,
      prio: 2,
      turn: true,
      anim: [
        [0, A],
        [5, aimPose(A, 90, { t1: 60, s1: 10, t2: -30, s2: -60 })],
        [10, aimPose(A, 90, { lean: -8, t1: 50, s1: 0, t2: -40, s2: -70 })],
        [18, aimPose(A, 90, { lean: -4, t1: 50, s1: 0, t2: -40, s2: -70 })],
        [36, A],
      ],
      proj: [arrow(9, 34, 30, 0)],
      vel: [{ f: 9, vx: -1.5, add: true }],
    },
    uair: {
      name: 'Up Shot',
      total: 34,
      landLag: 7,
      prio: 2,
      anim: [
        [0, A],
        [5, aimPose(A, 175, { lean: -16, t1: 70, s1: 0, t2: 20, s2: -30 })],
        [18, aimPose(A, 175, { lean: -16, t1: 70, s1: 0, t2: 20, s2: -30 })],
        [34, A],
      ],
      proj: [arrow(8, 6, 72, 88, 5, { hitAng: 88 })],
    },
    dair: {
      name: 'Dive Shot',
      total: 38,
      landLag: 9,
      prio: 2,
      anim: [
        [0, A],
        [5, aimPose(A, 45, { lean: 28, t1: 20, s1: -40, t2: -50, s2: -90 })],
        [20, aimPose(A, 45, { lean: 28, t1: 20, s1: -40, t2: -50, s2: -90 })],
        [38, A],
      ],
      proj: [arrow(9, 30, 4, -45, 6, { hitAng: 45 })],
      vel: [{ f: 9, vy: 4, when: 'air' }],
    },
    nspec: {
      // Hold up or down while drawing (until the arrow leaves) to aim 45 degrees up or down.
      name: 'Charged Shot',
      total: 46,
      prio: 3,
      aim: 45,
      charge: { at: 12, max: 50 },
      anim: [
        [0, S],
        [12, aimPose(S, 90, { a2: -80, f2: 100, lean: -6, t1: 32, s1: 0, t2: -32, s2: -30, dy: -4 })],
        [16, aimPose(S, 90, { lean: -10, t1: 32, s1: 0, t2: -32, s2: -30, dy: -4, dx: -5 })],
        [24, aimPose(S, 90, { t1: 28, s1: -2, t2: -28, s2: -28, dy: -3, dx: -4 })],
        [46, S],
      ],
      proj: [arrow(13, 34, 30, 0, 7, { speed: 18, hitAng: 38, bkb: 30, kbg: 50 })],
    },
    sspec: {
      name: 'Triple Shot',
      total: 48,
      prio: 1,
      turn: true,
      anim: [
        [0, S],
        [10, aimPose(S, 90, { t1: 40, s1: -10, t2: -36, s2: -40, dy: -6 })],
        [16, aimPose(S, 90, { lean: -8, t1: 40, s1: -10, t2: -36, s2: -40, dy: -6, dx: -5 })],
        [24, aimPose(S, 90, { t1: 36, s1: -8, t2: -32, s2: -36, dy: -5, dx: -4 })],
        [48, S],
      ],
      proj: [arrow(14, 34, 30, 0, 4, { kbg: 35 }), arrow(14, 34, 30, 12, 4, { kbg: 35 }), arrow(14, 34, 30, -12, 4, { kbg: 35 })],
    },
    uspec: {
      name: 'Rocket Arrow',
      total: 34,
      prio: 1,
      drift: 1.1,
      anim: [
        [0, S],
        [5, aimPose(A, 4, { lean: 0, t1: 70, s1: 20, t2: 60, s2: 10 })],
        [8, pose(A, { a1: 150, f1: 160, a2: 120, f2: 150, t1: 20, s1: -10, t2: -20, s2: -40 })],
        [34, A],
      ],
      proj: [arrow(7, 0, -8, -90, 7, { speed: 20, hitAng: -80, bkb: 25, kbg: 50 })],
      vel: [{ f: 7, vy: 16.1 }],
    },
    dspec: {
      name: 'Backflip Kick',
      total: 32,
      prio: 2,
      anim: keys(
        [0, S],
        [3, S, { lean: -10, t1: 90, s1: 100, t2: -10, s2: -10, a1: 150, f1: 160 }],
        [6, S, { lean: -10, t1: 100, s1: 110, t2: -10, s2: -10, a1: 150, f1: 160 }],
        [14, A, { rot: 360, t1: 40, s1: -20 }],
        [32, A, { rot: 360 }],
      ),
      hits: [{ f: [3, 6], at: 'foot1', r: 12, dmg: 8, ang: 40, bkb: 62, kbg: 82 }],
      vel: [
        { f: 5, vx: -8 },
        { f: 5, vy: 7, when: 'ground' },
        { f: 5, vy: 5, when: 'air' },
      ],
    },
  },
};
