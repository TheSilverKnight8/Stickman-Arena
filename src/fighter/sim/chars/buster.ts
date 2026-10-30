import { pose } from '../skeleton';
import type { CharDef } from '../types';
import { baseAnims, keys } from './common';

// BUSTER: heavyweight. Great survivability and damage, decent neutral; low
// speed, easily comboed (falls fast). Slow frame data (spec). Built like an
// ape (Caleb): comically large arms and a regular-sized head, hunched over
// with the knuckles near the floor. The spec's armor was taken out at Caleb's
// request: Buster takes less knockback while standing on the ground instead.
// Two command grabs: the dashing grab (side special) throws backward, and the
// down tilt is a suplex.

const S = pose({ lean: 32, a1: 34, f1: 14, a2: -6, f2: -16, t1: 30, s1: -10, t2: -25, s2: -30 });
const A = pose(S, { lean: 15, t1: 50, s1: -10, t2: -20, s2: -40, a1: 70, f1: 100, a2: 55, f2: 85 });
const crouch = pose(S, { lean: 45, t1: 70, s1: -15, t2: 40, s2: -70 });

export const buster: CharDef = {
  id: 'buster',
  name: 'Buster',
  archetype: 'Heavyweight',
  color: '#f07a1c',
  alt: '#b0501a',
  body: { torso: 32, upper: 30, fore: 30, thigh: 19, shin: 18, head: 10, weapon: 0, torsoR: 14, limbR: 7, armR: 10 },
  line: 6.5,
  armLine: 12,
  halfWidth: 22,
  height: 88,
  projLimit: 1,
  armorKb: 0,
  // No armor (Caleb): instead, Buster takes 15% less knockback while standing on the ground.
  groundKb: 0.85,
  stats: {
    weight: 130,
    run: 5.2,
    groundAccel: 0.65,
    friction: 0.7,
    air: 4.2,
    airAccel: 0.42,
    airFriction: 0.05,
    gravity: 0.59,
    maxFall: 10.3,
    fastFall: 16,
    jump: 14.2,
    shortHop: 9.8,
    doubleJump: 12.9,
    squat: 4,
  },
  anims: baseAnims({
    stand: S,
    air: A,
    runLean: 42,
    // Knuckle-walking: the arms swing forward to the floor in turn.
    runArms: [
      { a1: 60, f1: 30, a2: -10, f2: -25 },
      { a1: -10, f1: -25, a2: 60, f2: 30 },
    ],
    idleShift: { lean: 36, a1: 38, a2: -2, dy: -2 },
    idleFrames: 60,
  }),
  moves: {
    jab: {
      // Quicker since the CPU study (Caleb: Buster has a hard time getting things started): hits from frame
      // 5 (was 9), 24 frames in all (was 30).
      name: 'Palm Shove',
      total: 24,
      prio: 2,
      anim: keys(
        [0, S],
        [3, S, { lean: 20, a1: 40, f1: 50, a2: 30, f2: 40, t1: 20, t2: -30, dx: -4 }],
        [5, S, { lean: 30, a1: 88, f1: 90, a2: 80, f2: 85, t1: 50, s1: 5, t2: -35, s2: -35, dx: 2 }],
        [11, S, { lean: 30, a1: 88, f1: 90, a2: 80, f2: 85, t1: 50, s1: 5, t2: -35, s2: -35, dx: 2 }],
        [24, S],
      ),
      hits: [
        { f: [5, 7], at: 'hand1', r: 15, dmg: 9, ang: 40, bkb: 45, kbg: 55 },
        { f: [5, 7], at: 'hand2', r: 15, dmg: 9, ang: 40, bkb: 45, kbg: 55 },
      ],
    },
    ftilt: {
      name: 'Hammer Fist',
      total: 50,
      prio: 3,
      turn: true,
      anim: keys(
        [0, S],
        [16, S, { lean: -10, a1: 200, f1: 210, a2: 190, f2: 200, t1: 20, s1: -10, t2: -30, s2: -30, dy: 4 }],
        [19, S, { lean: 40, a1: 100, f1: 70, a2: 100, f2: 70, t1: 55, s1: 5, t2: -40, s2: -45, dx: 2, dy: -4 }],
        [28, S, { lean: 40, a1: 100, f1: 70, a2: 100, f2: 70, t1: 55, s1: 5, t2: -40, s2: -45, dx: 2, dy: -4 }],
        [50, S],
      ),
      hits: [{ f: [18, 21], at: 'hand1', r: 17, dmg: 15, ang: 42, bkb: 42, kbg: 90 }],
    },
    utilt: {
      name: 'Overhead Clap',
      total: 40,
      prio: 3,
      anim: keys(
        [0, S],
        [9, S, { lean: 10, a1: 100, f1: 100, a2: -80, f2: -80, t1: 40, s1: -15, t2: -30, s2: -40, dy: -4 }],
        [13, S, { lean: -4, a1: 170, f1: 178, a2: 190, f2: 182, t1: 20, s1: 0, t2: -20, s2: -20, dy: 4 }],
        [20, S, { lean: -4, a1: 170, f1: 178, a2: 190, f2: 182, t1: 20, s1: 0, t2: -20, s2: -20, dy: 4 }],
        [40, S],
      ),
      hits: [
        { f: [12, 16], at: [8, 100], r: 24, dmg: 13, ang: 88, bkb: 42, kbg: 85 },
        { f: [12, 16], at: 'hand1', r: 16, dmg: 13, ang: 88, bkb: 42, kbg: 85 },
      ],
    },
    dtilt: {
      // A command grab low in front; catching starts the suplex.
      name: 'Suplex',
      total: 36,
      anim: keys(
        [0, S],
        [5, crouch, { a1: 60, f1: 40, a2: 50, f2: 30, dx: -3 }],
        [8, crouch, { lean: 55, a1: 85, f1: 80, a2: 80, f2: 75, dx: 6 }],
        [14, crouch, { lean: 55, a1: 85, f1: 80, a2: 80, f2: 75, dx: 6 }],
        [36, S],
      ),
      hits: [
        { f: [8, 11], at: 'hand1', r: 16, dmg: 0, ang: 0, bkb: 0, kbg: 0, grab: 'dtiltThrow' },
        { f: [8, 11], at: 'hand2', r: 16, dmg: 0, ang: 0, bkb: 0, kbg: 0, grab: 'dtiltThrow' },
      ],
    },
    dtiltThrow: {
      // Lifts the opponent over his head and arches back, slamming them into the floor behind him.
      name: 'Suplex (throw)',
      total: 40,
      anim: keys(
        [0, crouch, { lean: 50, a1: 85, f1: 80, a2: 80, f2: 75 }],
        [8, S, { lean: 10, a1: 150, f1: 160, a2: 145, f2: 155, t1: 30, s1: -5, t2: -20, s2: -25 }],
        [16, S, { lean: -45, a1: 215, f1: 230, a2: 210, f2: 225, t1: 10, s1: 20, t2: -20, s2: 10 }],
        [21, S, { lean: -70, a1: 250, f1: 265, a2: 245, f2: 260, t1: 10, s1: 30, t2: -10, s2: 20, dy: -10 }],
        [30, S, { lean: -70, a1: 250, f1: 265, a2: 245, f2: 260, t1: 10, s1: 30, t2: -10, s2: 20, dy: -10 }],
        [40, S],
      ),
      throw: { hold: 'hand1', release: 21, dmg: 12, ang: 72, bkb: 60, kbg: 58, backward: true },
    },
    nair: {
      name: 'Body Spin',
      total: 40,
      landLag: 14,
      prio: 2,
      anim: keys(
        [0, A],
        [8, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 70, s1: 0, t2: -60, s2: -60 }],
        [20, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 70, s1: 0, t2: -60, s2: -60, rot: -360 }],
        [40, A, { rot: -360 }],
      ),
      hits: [
        { f: [10, 20], at: 'hand1', r: 15, dmg: 11, ang: 45, bkb: 35, kbg: 80, away: true },
        { f: [10, 20], at: 'hand2', r: 15, dmg: 11, ang: 45, bkb: 35, kbg: 80, away: true },
        { f: [10, 20], at: [0, 25], r: 22, dmg: 11, ang: 45, bkb: 35, kbg: 80, away: true },
      ],
    },
    fair: {
      name: 'Double Slam',
      total: 46,
      landLag: 18,
      prio: 3,
      turn: true,
      anim: keys(
        [0, A],
        [12, A, { lean: -20, a1: 190, f1: 200, a2: 180, f2: 190, t1: 30, s1: -30, t2: -30, s2: -70 }],
        [16, A, { lean: 25, a1: 70, f1: 40, a2: 70, f2: 40, t1: 70, s1: 0, t2: -10, s2: -40 }],
        [24, A, { lean: 25, a1: 70, f1: 40, a2: 70, f2: 40, t1: 70, s1: 0, t2: -10, s2: -40 }],
        [46, A],
      ),
      hits: [
        { f: [16, 18], at: 'hand1', r: 17, dmg: 17, ang: -75, bkb: 30, kbg: 75 },
        { f: [16, 20], at: 'elbow1', to: 'hand1', r: 14, dmg: 13, ang: 45, bkb: 35, kbg: 80 },
      ],
    },
    uair: {
      name: 'Headbutt',
      total: 38,
      landLag: 12,
      prio: 3,
      anim: keys(
        [0, A],
        [8, A, { lean: -30, a1: -60, f1: -40, a2: -70, f2: -50, t1: 70, s1: 20, t2: 40, s2: 0 }],
        [11, A, { lean: 5, a1: -20, f1: 0, a2: -30, f2: -10, t1: 20, s1: -30, t2: -10, s2: -50 }],
        [18, A, { lean: 5, a1: -20, f1: 0, a2: -30, f2: -10, t1: 20, s1: -30, t2: -10, s2: -50 }],
        [38, A],
      ),
      hits: [{ f: [11, 15], at: 'head', r: 20, dmg: 14, ang: 85, bkb: 40, kbg: 85 }],
    },
    dair: {
      name: 'Drill Stomp',
      total: 44,
      landLag: 18,
      prio: 3,
      anim: keys(
        [0, A],
        [10, A, { t1: 90, s1: 100, t2: 80, s2: 90, a1: 160, f1: 170, a2: 150, f2: 160, lean: -5 }],
        [14, A, { lean: 0, t1: 0, s1: 0, t2: 5, s2: 0, a1: 120, f1: 140, a2: 110, f2: 130 }],
        [22, A, { lean: 0, t1: 0, s1: 0, t2: 5, s2: 0, a1: 120, f1: 140, a2: 110, f2: 130 }],
        [44, A],
      ),
      hits: [
        { f: [14, 18], at: 'foot1', r: 17, dmg: 15, ang: -85, bkb: 30, kbg: 75 },
        { f: [14, 18], at: 'foot2', r: 17, dmg: 15, ang: -85, bkb: 30, kbg: 75 },
      ],
    },
    nspec: {
      // Bowls a boulder underhand: it rolls slowly along the floor and drops off ledges.
      name: 'Boulder Roll',
      total: 46,
      prio: 3,
      anim: keys(
        [0, S],
        [14, crouch, { lean: 30, a1: -40, f1: -25, a2: -40, f2: -25, dx: -4 }],
        [20, crouch, { lean: 55, a1: 60, f1: 65, a2: 60, f2: 65, dx: 6 }],
        [28, crouch, { lean: 55, a1: 60, f1: 65, a2: 60, f2: 65, dx: 6 }],
        [46, S],
      ),
      proj: [{ f: 20, kind: 'boulder', x: 55, y: -25, speed: 3.2, ang: 0, dmg: 12, hitAng: 50, bkb: 42, kbg: 64 }],
    },
    sspec: {
      // A dashing command grab: lunges forward with both arms out; catching starts the throw. Super armor
      // from the start to the end of the lunge (Caleb's change after the CPU study).
      name: 'Lunge Grab',
      total: 46,
      turn: true,
      superArmor: [1, 22],
      anim: keys(
        [0, S],
        [6, S, { lean: 50, a1: -20, f1: 10, a2: -30, f2: 0, t1: 50, s1: 10, t2: -40, s2: -50, dy: -4 }],
        [9, S, { lean: 50, a1: 92, f1: 88, a2: 86, f2: 84, t1: -30, s1: -60, t2: 50, s2: 10 }],
        [15, S, { lean: 50, a1: 92, f1: 88, a2: 86, f2: 84, t1: 50, s1: 10, t2: -40, s2: -50 }],
        [21, S, { lean: 50, a1: 92, f1: 88, a2: 86, f2: 84, t1: -30, s1: -60, t2: 50, s2: 10 }],
        [30, S, { lean: 30, a1: 60, f1: 40, a2: 50, f2: 30 }],
        [46, S],
      ),
      hits: [
        { f: [9, 22], at: 'hand1', r: 16, dmg: 0, ang: 0, bkb: 0, kbg: 0, grab: 'sspecThrow' },
        { f: [9, 22], at: 'hand2', r: 16, dmg: 0, ang: 0, bkb: 0, kbg: 0, grab: 'sspecThrow' },
      ],
      vel: [
        { f: 7, vx: 10 },
        { f: 7, vy: 2, when: 'air' },
        { f: 23, vx: 3 },
      ],
      gravity: { f: [7, 22], mul: 0.35 },
    },
    sspecThrow: {
      // Plants his feet, swings the opponent up over his head and hurls them behind him.
      name: 'Lunge Grab (throw)',
      total: 36,
      anim: keys(
        [0, S, { lean: 40, a1: 92, f1: 88, a2: 86, f2: 84 }],
        [8, S, { lean: 10, a1: 160, f1: 170, a2: 150, f2: 160, t1: 40, s1: 0, t2: -30, s2: -30 }],
        [14, S, { lean: -30, a1: 230, f1: 240, a2: 220, f2: 230, t1: 20, s1: 0, t2: -40, s2: -40, dx: -6 }],
        [22, S, { lean: -30, a1: 240, f1: 245, a2: 230, f2: 240, t1: 20, s1: 0, t2: -40, s2: -40, dx: -6 }],
        [36, S],
      ),
      throw: { hold: 'hand1', release: 14, dmg: 10, ang: 35, bkb: 55, kbg: 72, backward: true },
    },
    uspec: {
      name: 'Rocket Leap',
      total: 50,
      prio: 3,
      drift: 1.2,
      anim: keys(
        [0, S],
        [8, crouch, { a1: -30, f1: -10, a2: -30, f2: -10 }],
        [11, S, { lean: -5, a1: 175, f1: 178, a2: 165, f2: 170, t1: 10, s1: -10, t2: -20, s2: -40 }],
        [30, S, { lean: -5, a1: 175, f1: 178, a2: 165, f2: 170, t1: 10, s1: -10, t2: -20, s2: -40 }],
        [50, A],
      ),
      // A blast around his feet just before he jumps (on the ground or in the air); nothing on the way up.
      hits: [
        { f: [7, 9], at: 'foot1', r: 22, dmg: 13, ang: 80, bkb: 52, kbg: 76 },
        { f: [7, 9], at: 'foot2', r: 22, dmg: 13, ang: 80, bkb: 52, kbg: 76 },
      ],
      vel: [{ f: 10, vx: 3, vy: 16.2 }],
    },
    dspec: {
      name: 'Ground Pound',
      total: 14,
      prio: 3,
      untilLand: 12,
      onLand: 'dspecLand',
      anim: keys(
        [0, S],
        [6, A, { t1: 90, s1: 60, t2: 80, s2: 50, a1: 150, f1: 170, a2: 140, f2: 160 }],
        [12, A, { lean: 0, t1: 10, s1: 0, t2: -10, s2: 0, a1: 160, f1: 175, a2: 150, f2: 170 }],
        [14, A],
      ),
      // Spikes in the air; an opponent standing on the ground is held for the landing hit instead (multi-hit tuning).
      hits: [{ f: [12, 12], at: 'hip', r: 28, dmg: 14, ang: -60, bkb: 35, kbg: 65, onGround: { ang: 90, bkb: 25, kbg: 0 } }],
      vel: [
        { f: 4, vy: 10, when: 'ground' },
        { f: 12, vx: 0, vy: -20 },
      ],
    },
    dspecLand: {
      name: 'Ground Pound (landing)',
      total: 26,
      prio: 2,
      anim: keys([0, crouch, { a1: 60, f1: 20, a2: 50, f2: 10, lean: 50 }], [26, S]),
      hits: [{ f: [0, 3], at: [0, 12], r: 44, dmg: 10, ang: 70, bkb: 50, kbg: 66, away: true }],
      proj: [
        { f: 1, kind: 'shock', x: 34, y: 0, speed: 9, ang: 0, dmg: 7, hitAng: 70, bkb: 50, kbg: 40, prio: 2 },
        { f: 1, kind: 'shock', x: -34, y: 0, speed: 9, ang: 180, dmg: 7, hitAng: 70, bkb: 50, kbg: 40, prio: 2 },
      ],
    },
  },
};
