import { pose } from '../skeleton';
import type { CharDef, ProjSpawn } from '../types';
import { aimPose, baseAnims, keys } from './common';

// RANGER: zoner. Average mobility and survivability, plenty of ranged tools;
// less effective close up, needs precision. An archer whose specials shoot
// (Charged Shot, Triple Shot, Rocket Arrow) or throw a bomb, while her tilts and
// aerials (Caleb's change after the CPU study) are melee: the bow, kicks, and a
// dagger drawn in the back hand. She wears a wide-brimmed hat and a quiver (drawn only).

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
  body: { torso: 30, upper: 17, fore: 16, thigh: 21, shin: 21, head: 10, weapon: 0, dagger: 16, torsoR: 9, limbR: 5 },
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
      // A backhand slash with the dagger, stepping in, the bow arm swinging back for balance.
      name: 'Dagger Slash',
      total: 24,
      prio: 2,
      turn: true,
      anim: keys(
        [0, S],
        [3, S, { lean: -6, a1: 60, f1: 40, a2: -70, f2: -40, t1: 20, s1: -5, t2: -20, s2: -25, dx: -2 }],
        [6, S, { lean: 20, a1: 10, f1: -20, a2: 112, f2: 110, t1: 45, s1: -5, t2: -30, s2: -40, dx: 7 }],
        [9, S, { lean: 22, a1: 0, f1: -30, a2: 125, f2: 135, t1: 45, s1: -5, t2: -30, s2: -40, dx: 7 }],
        [24, S],
      ),
      hits: [{ f: [5, 8], at: 'hand2', to: 'tip2', r: 11, dmg: 7, ang: 35, bkb: 34, kbg: 58 }],
    },
    utilt: {
      // Rises out of a crouch sweeping the dagger up from low in front to over her head.
      name: 'Dagger Upswing',
      total: 26,
      prio: 2,
      anim: keys(
        [0, S],
        [3, S, { lean: 10, a2: 40, f2: 20, t1: 30, s1: -20, t2: -30, s2: -35, dy: -3 }],
        [6, S, { lean: -10, a2: 150, f2: 170, t1: 10, s1: 0, t2: -10, s2: -10 }],
        [10, S, { lean: -18, a2: 200, f2: 215, t1: 10, s1: 0, t2: -10, s2: -10 }],
        [26, S],
      ),
      hits: [{ f: [6, 10], at: 'hand2', to: 'tip2', r: 12, dmg: 7, ang: 85, bkb: 40, kbg: 62 }],
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
      // Draws the dagger back and stabs straight ahead, front knee up.
      name: 'Dagger Stab',
      total: 28,
      landLag: 7,
      prio: 2,
      turn: true,
      anim: keys(
        [0, A],
        [3, A, { lean: -10, a1: 60, f1: 60, a2: -60, f2: -30 }],
        [6, A, { lean: 15, a1: -20, f1: -40, a2: 90, f2: 90, t1: 70, s1: 30, t2: -30, s2: -50 }],
        [12, A, { lean: 15, a1: -20, f1: -40, a2: 90, f2: 90, t1: 70, s1: 30, t2: -30, s2: -50 }],
        [28, A],
      ),
      hits: [{ f: [6, 9], at: 'hand2', to: 'tip2', r: 11, dmg: 8, ang: 40, bkb: 30, kbg: 68 }],
    },
    uair: {
      // Swings the bow overhead from in front to behind, leaning back into it.
      name: 'Bow Arc',
      total: 28,
      landLag: 6,
      prio: 2,
      anim: keys(
        [0, A],
        [3, A, { lean: 5, a1: 80, f1: 70 }],
        [6, A, { lean: -15, a1: 160, f1: 170, t1: 50, s1: 0, t2: 0, s2: -30 }],
        [10, A, { lean: -20, a1: 230, f1: 240, t1: 50, s1: 0, t2: 0, s2: -30 }],
        [28, A],
      ),
      hits: [{ f: [5, 10], at: 'hand1', r: 22, dmg: 7, ang: 85, bkb: 34, kbg: 70 }],
    },
    dair: {
      // Raises the dagger overhead and drives it straight down: the point spikes as it lands its blow.
      name: 'Dagger Drop',
      total: 34,
      landLag: 10,
      prio: 2,
      anim: keys(
        [0, A],
        [4, A, { lean: -10, a1: 120, f1: 140, a2: 160, f2: 170, t1: 80, s1: -10, t2: 60, s2: -30 }],
        [8, A, { lean: 25, a1: 120, f1: 140, a2: 10, f2: 0, t1: 40, s1: -20, t2: -10, s2: -40 }],
        [15, A, { lean: 25, a1: 120, f1: 140, a2: 10, f2: 0, t1: 40, s1: -20, t2: -10, s2: -40 }],
        [34, A],
      ),
      hits: [
        { f: [8, 10], at: 'hand2', to: 'tip2', r: 11, dmg: 9, ang: -70, bkb: 28, kbg: 52 },
        { f: [11, 15], at: 'hand2', to: 'tip2', r: 10, dmg: 6, ang: 45, bkb: 25, kbg: 40, prio: 1 },
      ],
    },
    nspec: {
      // Hold up or down while drawing (until the arrow leaves) to aim 45 degrees up or down.
      name: 'Charged Shot',
      total: 46,
      prio: 3,
      aim: 45,
      // Full charge in 40 frames (was 50); the arrow grows with the charge.
      charge: { at: 12, max: 40 },
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
      // Lobs a bomb forward in an arc. It comes to rest where it lands and goes off a second and a
      // half after the throw (not on contact), throwing everyone near it away; it never hurts Ranger.
      name: 'Fuse Bomb',
      total: 36,
      prio: 2,
      anim: keys(
        [0, S],
        [5, S, { lean: -10, a1: 60, f1: 50, a2: -100, f2: -60, t1: 25, s1: -5, t2: -20, s2: -30 }],
        [11, S, { lean: 15, a1: 40, f1: 20, a2: 120, f2: 140, t1: 35, s1: -10, t2: -25, s2: -35, dx: 4 }],
        [16, S, { lean: 12, a1: 40, f1: 20, a2: 100, f2: 110, t1: 35, s1: -10, t2: -25, s2: -35, dx: 4 }],
        [36, S],
      ),
      proj: [{ f: 11, kind: 'bomb', x: 20, y: 60, speed: 9.5, ang: 55, dmg: 14, hitAng: 62, bkb: 50, kbg: 90 }],
    },
  },
};
