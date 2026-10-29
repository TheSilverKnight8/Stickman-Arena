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
  projLimit: 2,
  armorKb: 0,
  stats: {
    weight: 78,
    run: 8.0,
    groundAccel: 1.3,
    friction: 1.0,
    air: 5.2,
    airAccel: 0.62,
    airFriction: 0.12,
    gravity: 0.42,
    maxFall: 8.1,
    fastFall: 13,
    jump: 13.9,
    shortHop: 9.2,
    doubleJump: 13.4,
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
      total: 10,
      anim: keys([0, S], [2, S, { lean: 0, dx: -6, a1: 90, f1: 90 }], [6, S, { lean: 0, dx: -6, a1: 90, f1: 90 }], [10, S]),
      hits: [{ f: [2, 5], at: 'hand1', r: 17, dmg: 4, ang: 45, bkb: 25, kbg: 28 }],
    },
    ftilt: {
      name: 'Lunge Poke',
      total: 20,
      turn: true,
      anim: keys([0, S], [4, S, { lean: 50, t1: 70, s1: 30, t2: -60, s2: -60, a1: 90, f1: 90, dx: 6 }], [10, S, { lean: 50, t1: 70, s1: 30, t2: -60, s2: -60, a1: 90, f1: 90, dx: 6 }], [20, S]),
      hits: [{ f: [6, 10], at: 'hand1', r: 18, dmg: 9, ang: 40, bkb: 30, kbg: 50 }],
      vel: [{ f: 5, vx: 10, when: 'ground' }],
    },
    utilt: {
      name: 'Arc Kick',
      total: 18,
      anim: keys(
        [0, S],
        [3, S, { lean: -40, dx: -8, t1: 120, s1: 140, t2: -10, s2: -30, a1: -60, f1: -80, a2: -100, f2: -120 }],
        [6, S, { lean: -50, dx: -8, t1: 175, s1: 185, t2: -10, s2: -30, a1: -60, f1: -80, a2: -100, f2: -120 }],
        [9, S, { lean: -50, dx: -8, t1: 210, s1: 220, t2: -10, s2: -30, a1: -60, f1: -80, a2: -100, f2: -120 }],
        [18, S],
      ),
      hits: [{ f: [4, 10], at: 'foot1', r: 19, dmg: 8, ang: 95, bkb: 35, kbg: 84 }],
    },
    dtilt: {
      name: 'Slide',
      total: 22,
      anim: keys(
        [0, S],
        [3, S, { lean: -70, t1: 95, s1: 95, t2: 60, s2: 40, a1: -100, f1: -110, a2: -60, f2: -90 }],
        [15, S, { lean: -70, t1: 95, s1: 95, t2: 60, s2: 40, a1: -100, f1: -110, a2: -60, f2: -90 }],
        [22, S],
      ),
      hits: [{ f: [4, 14], at: 'foot1', r: 18, dmg: 8, ang: 72, bkb: 45, kbg: 26 }],
      vel: [{ f: 3, vx: 11, when: 'ground' }],
    },
    nair: {
      name: 'Whirl',
      total: 18,
      landLag: 4,
      anim: keys(
        [0, A],
        [3, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 80, s1: 90, t2: -80, s2: -90 }],
        [10, A, { a1: 90, f1: 90, a2: -90, f2: -90, t1: 80, s1: 90, t2: -80, s2: -90, rot: 360 }],
        [18, A, { rot: 360 }],
      ),
      hits: [
        // Pulls the opponent in toward Phantom and a little up, for a follow-up.
        { f: [4, 10], at: 'foot1', r: 17, dmg: 6, ang: 45, bkb: 24, kbg: 15, pull: true },
        { f: [4, 10], at: 'foot2', r: 17, dmg: 6, ang: 45, bkb: 24, kbg: 15, pull: true },
        { f: [4, 10], at: 'hand1', r: 16, dmg: 6, ang: 45, bkb: 24, kbg: 15, pull: true },
      ],
    },
    fair: {
      name: 'Air Lunge',
      total: 20,
      landLag: 4,
      turn: true,
      anim: keys([0, A], [5, A, { lean: 60, a1: 92, f1: 90, t1: 20, s1: -10, t2: -60, s2: -80 }], [10, A, { lean: 60, a1: 92, f1: 90, t1: 20, s1: -10, t2: -60, s2: -80 }], [20, A]),
      hits: [
        { f: [6, 10], at: 'hand1', r: 17, dmg: 10, ang: 38, bkb: 30, kbg: 90 },
        { f: [6, 10], at: 'elbow1', to: 'hand1', r: 15, dmg: 8, ang: 45, bkb: 25, kbg: 44 },
      ],
      vel: [{ f: 5, vx: 3, add: true }],
    },
    uair: {
      name: 'Scissor Kick',
      total: 18,
      landLag: 4,
      anim: keys(
        [0, A],
        [3, A, { lean: -20, t1: 150, s1: 160, t2: -150, s2: -160 }],
        [6, A, { lean: -20, t1: 200, s1: 200, t2: -200, s2: -200 }],
        [10, A, { lean: -20, t1: 200, s1: 200, t2: -200, s2: -200 }],
        [18, A],
      ),
      hits: [
        { f: [4, 9], at: 'foot1', r: 18, dmg: 8, ang: 85, bkb: 30, kbg: 48 },
        { f: [4, 9], at: 'foot2', r: 18, dmg: 8, ang: 85, bkb: 30, kbg: 48 },
      ],
    },
    // Hovers a moment with the knees tucked, then stomps both feet straight down.
    // The first frames of the stomp spike (send straight down): the edgeguarding finisher.
    dair: {
      name: 'Hover Stomp',
      total: 25,
      landLag: 6,
      anim: keys(
        [0, A],
        [5, A, { lean: -5, t1: 110, s1: 150, t2: 95, s2: 140, a1: 150, f1: 165, a2: 140, f2: 155 }],
        [8, A, { lean: 5, t1: 5, s1: 0, t2: 12, s2: 6, a1: 120, f1: 150, a2: 110, f2: 140 }],
        [15, A, { lean: 5, t1: 5, s1: 0, t2: 12, s2: 6, a1: 120, f1: 150, a2: 110, f2: 140 }],
        [25, A],
      ),
      hits: [
        { f: [8, 9], at: 'foot1', r: 19, dmg: 10, ang: -80, bkb: 30, kbg: 70 },
        { f: [8, 9], at: 'foot2', r: 19, dmg: 10, ang: -80, bkb: 30, kbg: 70 },
        { f: [10, 14], at: 'foot1', r: 17, dmg: 6, ang: 60, bkb: 30, kbg: 45 },
      ],
      vel: [{ f: 1, vy: 0.5 }],
      gravity: { f: [1, 10], mul: 0.2 },
    },
    nspec: {
      name: 'Phantom Orb',
      total: 23,
      anim: keys([0, S], [6, S, { lean: 10, a1: 160, f1: 170, a2: 150, f2: 160 }], [10, S, { lean: 30, a1: 92, f1: 90, a2: 85, f2: 88 }], [16, S, { lean: 30, a1: 92, f1: 90, a2: 85, f2: 88 }], [23, S]),
      proj: [{ f: 10, kind: 'orb', x: 40, y: 35, speed: 9, ang: 0, dmg: 8, hitAng: 45, bkb: 30, kbg: 42 }],
    },
    sspec: {
      name: 'Blink Strike',
      total: 25,
      turn: true,
      intangible: [2, 7],
      anim: keys([0, S], [3, S, { lean: 70, a1: 95, f1: 92, t1: 30, s1: 10, t2: -80, s2: -90 }], [14, S, { lean: 70, a1: 95, f1: 92, t1: 30, s1: 10, t2: -80, s2: -90 }], [25, S]),
      hits: [{ f: [6, 12], at: 'hand1', to: 'neck', r: 19, dmg: 9, ang: 35, bkb: 42, kbg: 40 }],
      vel: [
        { f: 3, vx: 17 },
        { f: 3, vy: 0, when: 'air' },
        { f: 14, vx: 3 },
      ],
      gravity: { f: [3, 14], mul: 0 },
    },
    uspec: {
      name: 'Phase Rise',
      total: 27,
      hidden: [3, 12],
      intangible: [3, 14],
      teleport: { f: 12, dist: 250 },
      anim: keys(
        [0, S],
        [3, crouch, { a1: 10, f1: 20 }],
        [12, crouch, { a1: 10, f1: 20 }],
        [14, A, { lean: -10, a1: 170, f1: 180, a2: 160, f2: 170, t1: 10, s1: -10, t2: -20, s2: -40 }],
        [27, A],
      ),
      hits: [{ f: [13, 16], at: [0, 40], r: 30, dmg: 5, ang: 80, bkb: 42, kbg: 42 }],
      vel: [{ f: 3, vx: 0, vy: 0 }],
      gravity: { f: [3, 16], mul: 0 },
    },
    // The kill move: the knee comes up, then the heel drives out while the body
    // leans far back. The heel is the strongest hit, but the whole leg launches.
    // Starts on frame 13 like before, with less ending lag.
    dspec: {
      name: 'Reaper Kick',
      total: 36,
      anim: keys(
        [0, S],
        [9, S, { lean: -5, t1: 125, s1: 20, t2: -10, s2: -25, a1: 40, f1: 110, a2: -30, f2: 10 }],
        [13, S, { lean: -35, t1: 98, s1: 98, t2: -15, s2: -25, a1: -50, f1: -30, a2: -80, f2: -60 }],
        [19, S, { lean: -35, t1: 98, s1: 98, t2: -15, s2: -25, a1: -50, f1: -30, a2: -80, f2: -60 }],
        [36, S],
      ),
      hits: [
        { f: [13, 16], at: 'foot1', to: 'foot1', r: 18, dmg: 15, ang: 40, bkb: 42, kbg: 90 },
        { f: [13, 18], at: 'knee1', to: 'foot1', r: 14, dmg: 11, ang: 42, bkb: 38, kbg: 78 },
      ],
      vel: [{ f: 11, vx: 4, when: 'ground' }],
    },
  },
};
