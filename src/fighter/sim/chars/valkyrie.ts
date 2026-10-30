import { dcos, dsin } from '../fmath';
import { pose } from '../skeleton';
import type { CharDef, HitDef, VelDef } from '../types';
import { baseAnims, keys } from './common';

// VALKYRIE: aerial ace (Caleb). Four jumps (the jump from the ground and three
// in the air), aerials stronger than ground moves, poor ground mobility, great
// air mobility, a short sword with poor range, and an emphasis on vertical
// combos. A small build with wings (the wings are drawn, not part of the hurtbox).
//
// The ground moves are quick and short and pop opponents upward; the aerials do
// the damage and the finishing. The moves use different parts and motions (the
// hilt, a lunge, the wings, the feet, flips and spins), not only short sword swipes.

const S = pose({ lean: 8, a1: 35, f1: 100, w: 35, a2: -20, f2: 10, t1: 18, s1: -6, t2: -18, s2: -24 });
const A = pose(S, { t1: 45, s1: -15, t2: -10, s2: -40 });
const crouch = pose(S, { lean: 18, t1: 58, s1: -10, t2: 22, s2: -55 });

/**
 * Shuttle Loop's path: a speed for each frame of a full loop that starts moving
 * straight up, turns back over the top, down, and round to straight up again.
 * Worked out with the simulation's exact sine.
 */
function loopVel(from: number, frames: number, speed: number): VelDef[] {
  const out: VelDef[] = [];
  for (let i = 0; i <= frames; i++) {
    const a = 90 + (360 * i) / frames;
    out.push({ f: from + i, vx: dcos(a) * speed, vy: dsin(a) * speed });
  }
  return out;
}

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
    jump: 12.9,
    shortHop: 8.8,
    doubleJump: 11.3,
    airJumps: 3,
    squat: 4,
  },
  anims: {
    ...baseAnims({
      stand: S,
      air: A,
      runLean: 12,
      runArms: [
        { a1: 20, f1: 90, a2: 60, f2: 110 },
        { a1: 50, f1: 110, a2: -30, f2: 20 },
      ],
      idleShift: { lean: 11, w: 28, dy: -1 },
    }),
    // Gliding: the body nearly level, the sword forward, the legs trailing.
    glide: [
      [0, pose(A, { lean: 70, a1: 95, f1: 100, w: -10, a2: 60, f2: 90, t1: -20, s1: -30, t2: -35, s2: -45 })],
      [30, pose(A, { lean: 74, a1: 95, f1: 100, w: -10, a2: 60, f2: 90, t1: -24, s1: -34, t2: -38, s2: -48, dy: 2 })],
      [60, pose(A, { lean: 70, a1: 95, f1: 100, w: -10, a2: 60, f2: 90, t1: -20, s1: -30, t2: -35, s2: -45 })],
    ],
  },
  moves: {
    // ---- On the ground: quick, short, and they pop opponents up.
    jab: {
      // A quick strike with the hilt, the blade held back.
      name: 'Pommel Strike',
      total: 14,
      prio: 1,
      anim: keys(
        [0, S],
        [2, S, { lean: 14, a1: 90, f1: 80, w: 170, t1: 30, s1: -4, t2: -26, s2: -30, dx: 4 }],
        [6, S, { lean: 14, a1: 90, f1: 80, w: 170, t1: 30, s1: -4, t2: -26, s2: -30, dx: 4 }],
        [14, S],
      ),
      hits: [{ f: [2, 4], at: 'hand1', r: 13, dmg: 3, ang: 80, bkb: 25, kbg: 15 }],
    },
    ftilt: {
      // A lunging stab: a long step forward and a straight thrust.
      name: 'Lunge Stab',
      total: 26,
      prio: 2,
      turn: true,
      anim: keys(
        [0, S],
        [5, S, { lean: -4, a1: 20, f1: 60, w: 30, t1: 20, s1: -5, t2: -30, s2: -40, dx: -4 }],
        [7, S, { lean: 30, a1: 88, f1: 90, w: 0, a2: -40, f2: -20, t1: 60, s1: 10, t2: -50, s2: -50, dx: 6 }],
        [12, S, { lean: 30, a1: 88, f1: 90, w: 0, a2: -40, f2: -20, t1: 60, s1: 10, t2: -50, s2: -50, dx: 6 }],
        [26, S],
      ),
      hits: blade([7, 9], { dmg: 6, ang: 60, bkb: 35, kbg: 45 }, { dmg: 5, ang: 62, bkb: 32, kbg: 40 }, 10),
      vel: [{ f: 6, vx: 4, when: 'ground' }],
    },
    utilt: {
      // Crouches and snaps the wings up: the hit is above her shoulders, not on the sword.
      name: 'Wing Flare',
      total: 22,
      prio: 1,
      anim: keys([0, S], [4, crouch, { a1: 10, f1: 40, w: 40 }], [6, S, { lean: -6, a1: 30, f1: 70, w: 40, t1: 10, s1: 0, t2: -14, s2: -20, dy: 4 }], [12, S, { lean: -6, a1: 30, f1: 70, w: 40, t1: 10, s1: 0, t2: -14, s2: -20, dy: 4 }], [22, S]),
      // Straight up with little growth: the start of a juggle.
      hits: [
        { f: [5, 9], at: [-8, 62], r: 22, dmg: 5, ang: 90, bkb: 50, kbg: 28 },
        { f: [5, 9], at: [6, 42], r: 16, dmg: 5, ang: 90, bkb: 50, kbg: 28 },
      ],
    },
    dtilt: {
      // A low sweep with the feet (her talons), the body dropped near the floor.
      name: 'Talon Sweep',
      total: 18,
      prio: 1,
      anim: keys(
        [0, S],
        [3, crouch, { lean: 40, t1: 70, s1: 30, t2: 40, s2: -60, a1: 120, f1: 150, w: 20 }],
        [5, crouch, { lean: 45, t1: 92, s1: 95, t2: 40, s2: -60, a1: 120, f1: 150, w: 20, dy: -6 }],
        [9, crouch, { lean: 45, t1: 92, s1: 95, t2: 40, s2: -60, a1: 120, f1: 150, w: 20, dy: -6 }],
        [18, S],
      ),
      hits: [{ f: [5, 8], at: 'foot1', r: 13, dmg: 4, ang: 85, bkb: 40, kbg: 20 }],
    },

    // ---- In the air: stronger than the ground moves.
    nair: {
      name: 'Wing Spin',
      total: 30,
      landLag: 8,
      prio: 2,
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
      // A big overhead cleave, the whole body following through forward.
      name: 'Sky Cleave',
      total: 32,
      landLag: 11,
      prio: 2,
      turn: true,
      anim: keys(
        [0, A],
        [5, A, { lean: -20, a1: 170, f1: 175, w: 0, t1: 20, s1: -30, t2: -30, s2: -70 }],
        [9, A, { lean: 15, a1: 100, f1: 95, w: 0, t1: 60, s1: 0, t2: -20, s2: -60 }],
        [12, A, { lean: 30, a1: 45, f1: 35, w: 0, t1: 80, s1: 20, t2: -10, s2: -40 }],
        [18, A, { lean: 30, a1: 45, f1: 35, w: 0, t1: 80, s1: 20, t2: -10, s2: -40 }],
        [32, A],
      ),
      hits: blade([8, 12], { dmg: 11, ang: 42, bkb: 36, kbg: 80 }, { dmg: 9, ang: 45, bkb: 33, kbg: 72 }, 13),
    },
    uair: {
      // A backflip with the sword held out: the blade sweeps round in a circle overhead.
      name: 'Somersault Slash',
      total: 28,
      landLag: 6,
      prio: 2,
      anim: keys(
        [0, A],
        [3, A, { a1: 100, f1: 110, w: 0, t1: 90, s1: 20, t2: 70, s2: 0 }],
        [13, A, { a1: 100, f1: 110, w: 0, t1: 90, s1: 20, t2: 70, s2: 0, rot: 360 }],
        [28, A, { rot: 360 }],
      ),
      // Sends straight up with moderate growth: with three air jumps, Valkyrie can follow and hit again.
      hits: blade([5, 11], { dmg: 8, ang: 88, bkb: 38, kbg: 52 }, { dmg: 7, ang: 90, bkb: 36, kbg: 48 }, 12),
    },
    dair: {
      // Stomps straight down with both feet (her talons). The first frames spike.
      name: 'Talon Stomp',
      total: 32,
      landLag: 12,
      prio: 2,
      anim: keys(
        [0, A],
        [6, A, { lean: -10, t1: 110, s1: 150, t2: 95, s2: 140, a1: 150, f1: 165, w: 10, a2: 140, f2: 155 }],
        [9, A, { lean: 5, t1: 5, s1: 0, t2: 12, s2: 6, a1: 130, f1: 150, w: 10, a2: 110, f2: 140 }],
        [16, A, { lean: 5, t1: 5, s1: 0, t2: 12, s2: 6, a1: 130, f1: 150, w: 10, a2: 110, f2: 140 }],
        [32, A],
      ),
      hits: [
        { f: [9, 10], at: 'foot1', r: 15, dmg: 12, ang: -82, bkb: 30, kbg: 72 },
        { f: [9, 10], at: 'foot2', r: 15, dmg: 12, ang: -82, bkb: 30, kbg: 72 },
        { f: [11, 15], at: 'foot1', r: 13, dmg: 7, ang: 65, bkb: 30, kbg: 52, prio: 1 },
      ],
    },

    // ---- Specials.
    nspec: {
      name: 'Gale Burst',
      total: 30,
      prio: 1,
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
      // Dashes forward stretched out flat, sword first, the legs kicking back.
      name: 'Wing Dash',
      total: 32,
      prio: 2,
      turn: true,
      anim: keys(
        [0, S],
        [2, crouch, { lean: 30, a1: 40, f1: 60, w: 30, dx: -4 }],
        [4, S, { lean: 78, a1: 92, f1: 90, w: 0, a2: -60, f2: -80, t1: -30, s1: -60, t2: -60, s2: -90 }],
        [9, S, { lean: 78, a1: 92, f1: 90, w: 0, a2: -60, f2: -80, t1: -10, s1: -40, t2: -80, s2: -100 }],
        [14, S, { lean: 78, a1: 92, f1: 90, w: 0, a2: -60, f2: -80, t1: -30, s1: -60, t2: -60, s2: -90 }],
        [32, S],
      ),
      hits: blade([6, 12], { dmg: 8, ang: 45, bkb: 40, kbg: 50 }, { dmg: 6, ang: 50, bkb: 35, kbg: 40 }, 11),
      vel: [
        { f: 3, vx: 14 },
        { f: 3, vy: 0, when: 'air' },
        { f: 14, vx: 4 },
      ],
      gravity: { f: [3, 14], mul: 0 },
    },
    uspec: {
      // Like Meta Knight's Shuttle Loop: flies up slashing, loops backward all the way round, flies
      // straight up again through the opponent with the launcher, and comes out of it gliding forward
      // (Caleb's change after the CPU study). The rising slashes knock a set amount straight up and a
      // little in toward her (whatever the damage or weight), so the opponent is still above her when
      // she comes out of the loop: tuned so the launcher follows them from every spot tried. While
      // gliding, any attack, jump or dodge ends the glide and comes out at once (jumps left are kept).
      name: 'Shuttle Loop',
      total: 38,
      prio: 2,
      drift: 0,
      turn: true,
      glide: true,
      anim: keys(
        [0, S],
        [4, crouch, { a1: 40, f1: 60, w: 0 }],
        [6, A, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40 }],
        [13, A, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40 }],
        [25, A, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40, rot: 360 }],
        [34, A, { lean: -5, a1: 175, f1: 178, w: 0, t1: 15, s1: -10, t2: -20, s2: -40, rot: 360 }],
        [38, A, { lean: 70, a1: 95, f1: 100, w: -10, t1: -20, s1: -30, t2: -35, s2: -45, rot: 360 }],
      ),
      hits: [
        { f: [6, 12], at: 'tip', r: 14, dmg: 2, ang: 85, bkb: 62, kbg: 0, rehit: 3, pull: true, group: 0 },
        { f: [6, 12], at: 'hand1', to: 'tip', r: 10, dmg: 2, ang: 85, bkb: 62, kbg: 0, rehit: 3, pull: true, group: 0 },
        { f: [26, 30], at: 'tip', r: 16, dmg: 6, ang: 88, bkb: 52, kbg: 76, group: 1 },
        { f: [26, 30], at: 'hand1', to: 'tip', r: 12, dmg: 5, ang: 88, bkb: 50, kbg: 70, group: 1 },
      ],
      vel: [{ f: 5, vx: 0, vy: 13 }, ...loopVel(13, 12, 14), { f: 26, vx: 1, vy: 12 }, { f: 34, vx: 6, vy: 0 }],
      gravity: { f: [13, 38], mul: 0 },
    },
    dspec: {
      name: 'Spear Dive',
      total: 12,
      prio: 2,
      untilLand: 10,
      onLand: 'dspecLand',
      anim: keys(
        [0, S],
        [6, A, { t1: 90, s1: 60, t2: 80, s2: 50, a1: 160, f1: 175, w: 0 }],
        [10, A, { lean: 0, t1: 5, s1: 0, t2: 10, s2: 5, a1: 2, f1: 0, w: 0 }],
        [12, A],
      ),
      // Sword first, straight down: the tip spikes in the air.
      // Spikes in the air; an opponent standing on the ground is held for the landing hit instead (multi-hit tuning).
      hits: blade(
        [10, 10],
        { dmg: 8, ang: -85, bkb: 30, kbg: 60, onGround: { ang: 90, bkb: 25, kbg: 0 } },
        { dmg: 6, ang: 70, bkb: 28, kbg: 45, onGround: { ang: 90, bkb: 25, kbg: 0 } },
        12,
      ),
      vel: [
        { f: 4, vy: 8, when: 'ground' },
        { f: 10, vx: 0, vy: -16 },
      ],
    },
    dspecLand: {
      name: 'Spear Dive (landing)',
      total: 20,
      prio: 1,
      anim: keys([0, crouch, { a1: 30, f1: 40, w: 0 }], [20, S]),
      // Landing pops nearby opponents straight up.
      hits: [
        { f: [0, 2], at: [28, 5], r: 22, dmg: 4, ang: 85, bkb: 50, kbg: 30, away: true },
        { f: [0, 2], at: [-28, 5], r: 22, dmg: 4, ang: 85, bkb: 50, kbg: 30, away: true },
      ],
    },
  },
};
