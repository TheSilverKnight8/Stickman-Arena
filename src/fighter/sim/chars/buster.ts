import { pose } from '../skeleton';
import type { CharDef } from '../types';
import { baseAnims, keys } from './common';

// BUSTER: heavyweight. Great survivability and damage, decent neutral; low
// speed, easily comboed (falls fast, big target). Large sprite and hurtbox,
// slow frame data, armor on some moves (spec).
//
// Armor: during the armored frames, a hit whose knockback is under 100 does
// its damage but does not launch or interrupt Buster. Harder hits break through.

const S = pose({ lean: 10, a1: 40, f1: 80, a2: 25, f2: 70, t1: 22, s1: 5, t2: -22, s2: -10 });
const A = pose(S, { t1: 45, s1: -10, t2: -15, s2: -35, a1: 70, f1: 100, a2: 60, f2: 90 });
const crouch = pose(S, { lean: 25, t1: 75, s1: -15, t2: 45, s2: -70 });

export const buster: CharDef = {
  id: 'buster',
  name: 'Buster',
  archetype: 'Heavyweight',
  color: '#e8a500',
  alt: '#9a5f00',
  body: { torso: 40, upper: 22, fore: 22, thigh: 25, shin: 24, head: 14, weapon: 0, torsoR: 15, limbR: 8 },
  line: 9,
  halfWidth: 22,
  height: 118,
  projLimit: 1,
  armorKb: 100,
  stats: {
    weight: 130,
    run: 4.8,
    groundAccel: 0.65,
    friction: 0.7,
    air: 3.6,
    airAccel: 0.33,
    airFriction: 0.05,
    gravity: 0.59,
    maxFall: 10.3,
    fastFall: 16,
    jump: 12.7,
    shortHop: 8.8,
    doubleJump: 11.5,
    squat: 6,
  },
  anims: baseAnims({
    stand: S,
    air: A,
    runLean: 16,
    runArms: [
      { a1: -20, f1: 40, a2: 70, f2: 110 },
      { a1: 70, f1: 110, a2: -20, f2: 40 },
    ],
    idleShift: { lean: 13, a1: 46, a2: 30, dy: -2 },
    idleFrames: 60,
  }),
  moves: {
    jab: {
      name: 'Palm Shove',
      total: 30,
      anim: keys(
        [0, S],
        [5, S, { lean: 0, a1: 30, f1: 40, a2: 20, f2: 30 }],
        [9, S, { lean: 25, a1: 88, f1: 90, a2: 80, f2: 85, t1: 40, s1: 5, t2: -30, s2: -30 }],
        [15, S, { lean: 25, a1: 88, f1: 90, a2: 80, f2: 85, t1: 40, s1: 5, t2: -30, s2: -30 }],
        [30, S],
      ),
      hits: [
        { f: [9, 11], at: 'hand1', r: 19, dmg: 9, ang: 40, bkb: 45, kbg: 55 },
        { f: [9, 11], at: 'hand2', r: 19, dmg: 9, ang: 40, bkb: 45, kbg: 55 },
      ],
    },
    ftilt: {
      name: 'Hammer Fist',
      total: 44,
      turn: true,
      armor: [6, 16],
      anim: keys(
        [0, S],
        [12, S, { lean: -20, a1: 200, f1: 210, a2: 190, f2: 200 }],
        [15, S, { lean: 30, a1: 100, f1: 80, a2: 100, f2: 80, t1: 45, s1: 5, t2: -35, s2: -40 }],
        [24, S, { lean: 30, a1: 100, f1: 80, a2: 100, f2: 80, t1: 45, s1: 5, t2: -35, s2: -40 }],
        [44, S],
      ),
      hits: [{ f: [14, 17], at: 'hand1', r: 21, dmg: 15, ang: 42, bkb: 42, kbg: 90 }],
    },
    utilt: {
      name: 'Overhead Clap',
      total: 40,
      anim: keys(
        [0, S],
        [9, S, { a1: 100, f1: 100, a2: -80, f2: -80 }],
        [13, S, { lean: 0, a1: 170, f1: 178, a2: 190, f2: 182 }],
        [20, S, { lean: 0, a1: 170, f1: 178, a2: 190, f2: 182 }],
        [40, S],
      ),
      hits: [
        { f: [12, 16], at: [0, 100], r: 27, dmg: 13, ang: 88, bkb: 42, kbg: 85 },
        { f: [12, 16], at: 'hand1', r: 18, dmg: 13, ang: 88, bkb: 42, kbg: 85 },
      ],
    },
    dtilt: {
      name: 'Ground Punch',
      total: 38,
      anim: keys(
        [0, S],
        [9, S, { lean: 20, a1: 160, f1: 170, t1: 40, s1: -10, t2: -10, s2: -40 }],
        [12, crouch, { lean: 55, a1: 60, f1: 30, t1: 60, s1: 0, t2: 20, s2: -60 }],
        [20, crouch, { lean: 55, a1: 60, f1: 30, t1: 60, s1: 0, t2: 20, s2: -60 }],
        [38, S],
      ),
      hits: [
        { f: [12, 15], at: 'hand1', r: 23, dmg: 12, ang: 75, bkb: 48, kbg: 68 },
        { f: [12, 15], at: [60, 6], r: 21, dmg: 12, ang: 75, bkb: 48, kbg: 68 },
      ],
    },
    nair: {
      name: 'Body Spin',
      total: 40,
      landLag: 14,
      anim: keys([0, A], [8, A, { a1: 90, f1: 90, a2: -90, f2: -90 }], [20, A, { a1: 90, f1: 90, a2: -90, f2: -90, rot: -360 }], [40, A, { rot: -360 }]),
      hits: [
        { f: [10, 20], at: 'hand1', r: 19, dmg: 11, ang: 45, bkb: 35, kbg: 80, away: true },
        { f: [10, 20], at: 'hand2', r: 19, dmg: 11, ang: 45, bkb: 35, kbg: 80, away: true },
        { f: [10, 20], at: [0, 30], r: 25, dmg: 11, ang: 45, bkb: 35, kbg: 80, away: true },
      ],
    },
    fair: {
      name: 'Double Slam',
      total: 46,
      landLag: 18,
      turn: true,
      anim: keys(
        [0, A],
        [12, A, { lean: -15, a1: 190, f1: 200, a2: 180, f2: 190 }],
        [16, A, { lean: 20, a1: 70, f1: 40, a2: 70, f2: 40 }],
        [24, A, { lean: 20, a1: 70, f1: 40, a2: 70, f2: 40 }],
        [46, A],
      ),
      hits: [
        { f: [16, 18], at: 'hand1', r: 20, dmg: 17, ang: -75, bkb: 30, kbg: 75 },
        { f: [16, 20], at: 'elbow1', to: 'hand1', r: 17, dmg: 13, ang: 45, bkb: 35, kbg: 80 },
      ],
    },
    uair: {
      name: 'Headbutt',
      total: 38,
      landLag: 12,
      anim: keys(
        [0, A],
        [8, A, { lean: -30, a1: -60, f1: -40, a2: -70, f2: -50 }],
        [11, A, { lean: 5, a1: -20, f1: 0, a2: -30, f2: -10 }],
        [18, A, { lean: 5, a1: -20, f1: 0, a2: -30, f2: -10 }],
        [38, A],
      ),
      hits: [{ f: [11, 15], at: 'head', r: 21, dmg: 14, ang: 85, bkb: 40, kbg: 85 }],
    },
    dair: {
      name: 'Drill Stomp',
      total: 44,
      landLag: 18,
      anim: keys(
        [0, A],
        [10, A, { t1: 90, s1: 100, t2: 80, s2: 90, a1: 160, f1: 170, a2: 150, f2: 160 }],
        [14, A, { lean: 0, t1: 0, s1: 0, t2: 5, s2: 0, a1: 120, f1: 140, a2: 110, f2: 130 }],
        [22, A, { lean: 0, t1: 0, s1: 0, t2: 5, s2: 0, a1: 120, f1: 140, a2: 110, f2: 130 }],
        [44, A],
      ),
      hits: [
        { f: [14, 18], at: 'foot1', r: 18, dmg: 15, ang: -85, bkb: 30, kbg: 75 },
        { f: [14, 18], at: 'foot2', r: 18, dmg: 15, ang: -85, bkb: 30, kbg: 75 },
      ],
    },
    nspec: {
      name: 'Boulder Lob',
      total: 46,
      anim: keys(
        [0, S],
        [14, S, { lean: -25, a1: 210, f1: 200, a2: 200, f2: 190 }],
        [20, S, { lean: 25, a1: 120, f1: 110, a2: 120, f2: 110 }],
        [28, S, { lean: 25, a1: 120, f1: 110, a2: 120, f2: 110 }],
        [46, S],
      ),
      proj: [{ f: 20, kind: 'boulder', x: 30, y: 85, speed: 9, ang: 40, dmg: 16, hitAng: 45, bkb: 50, kbg: 70 }],
    },
    sspec: {
      name: 'Charging Tackle',
      total: 52,
      turn: true,
      armor: [5, 30],
      stopOnHit: true,
      anim: keys(
        [0, S],
        [6, S, { lean: 45, a1: -20, f1: 10, a2: -30, f2: 0, t1: 50, s1: 10, t2: -40, s2: -50 }],
        [14, S, { lean: 45, a1: -20, f1: 10, a2: -30, f2: 0, t1: -30, s1: -60, t2: 50, s2: 10 }],
        [22, S, { lean: 45, a1: -20, f1: 10, a2: -30, f2: 0, t1: 50, s1: 10, t2: -40, s2: -50 }],
        [30, S, { lean: 45, a1: -20, f1: 10, a2: -30, f2: 0, t1: -30, s1: -60, t2: 50, s2: 10 }],
        [52, S],
      ),
      hits: [{ f: [8, 30], at: 'neck', r: 25, dmg: 12, ang: 40, bkb: 55, kbg: 70 }],
      vel: [
        { f: 7, vx: 10 },
        { f: 7, vy: 2, when: 'air' },
        { f: 31, vx: 3 },
      ],
      gravity: { f: [7, 30], mul: 0.35 },
    },
    uspec: {
      name: 'Rocket Leap',
      total: 50,
      armor: [1, 10],
      drift: 1.2,
      anim: keys(
        [0, S],
        [8, crouch, { a1: -30, f1: -10, a2: -30, f2: -10 }],
        [11, S, { lean: -5, a1: 175, f1: 178, a2: 165, f2: 170, t1: 10, s1: -10, t2: -20, s2: -40 }],
        [30, S, { lean: -5, a1: 175, f1: 178, a2: 165, f2: 170, t1: 10, s1: -10, t2: -20, s2: -40 }],
        [50, A],
      ),
      hits: [{ f: [10, 24], at: 'hand1', r: 21, dmg: 13, ang: 80, bkb: 52, kbg: 76 }],
      vel: [{ f: 10, vx: 3, vy: 16.2 }],
    },
    dspec: {
      name: 'Ground Pound',
      total: 14,
      armor: [6, 12],
      untilLand: 12,
      onLand: 'dspecLand',
      anim: keys(
        [0, S],
        [6, A, { t1: 90, s1: 60, t2: 80, s2: 50, a1: 150, f1: 170, a2: 140, f2: 160 }],
        [12, A, { lean: 0, t1: 10, s1: 0, t2: -10, s2: 0, a1: 160, f1: 175, a2: 150, f2: 170 }],
        [14, A],
      ),
      hits: [{ f: [12, 12], at: 'hip', r: 29, dmg: 14, ang: -60, bkb: 35, kbg: 65 }],
      vel: [
        { f: 4, vy: 10, when: 'ground' },
        { f: 12, vx: 0, vy: -20 },
      ],
    },
    dspecLand: {
      name: 'Ground Pound (landing)',
      total: 26,
      anim: keys([0, crouch, { a1: 60, f1: 20, a2: 50, f2: 10, lean: 40 }], [26, S]),
      hits: [{ f: [0, 3], at: [0, 12], r: 45, dmg: 10, ang: 70, bkb: 50, kbg: 55, away: true }],
      proj: [
        { f: 1, kind: 'shock', x: 34, y: 0, speed: 9, ang: 0, dmg: 7, hitAng: 70, bkb: 50, kbg: 40 },
        { f: 1, kind: 'shock', x: -34, y: 0, speed: 9, ang: 180, dmg: 7, hitAng: 70, bkb: 50, kbg: 40 },
      ],
    },
  },
};
