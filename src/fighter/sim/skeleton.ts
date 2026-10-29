import { dcos, dsin } from './fmath';

// Stick-figure skeletons. A pose is a set of joint angles; forward kinematics
// turns it into joint positions. The same joints are used to draw the figure
// and to build its hurtboxes, so what you see is what can be hit.
//
// Angles are in degrees for a figure facing right:
//   0 = pointing straight down, 90 = forward, 180 = straight up, -90 = backward.

export interface Pose {
  /** Torso tilt forward from upright. */
  lean: number;
  /** Front arm: upper arm, forearm. */
  a1: number;
  f1: number;
  /** Back arm. */
  a2: number;
  f2: number;
  /** Front leg: thigh, shin. */
  t1: number;
  s1: number;
  /** Back leg. */
  t2: number;
  s2: number;
  /** Whole-body rotation around the belly. Positive tips the head backward (a backflip); negative is a front flip. */
  rot: number;
  /** Hip offset. Grounded poses are planted on the floor automatically; dy lifts them. */
  dx: number;
  dy: number;
  /** Weapon angle relative to the front forearm. */
  w: number;
  /** Weapon shortening, 0 (full length) to 1 (none): a blade swung toward or away from the viewer. */
  ws: number;
}

export type PoseInput = Partial<Pose>;

const ZERO: Pose = { lean: 0, a1: 0, f1: 0, a2: 0, f2: 0, t1: 0, s1: 0, t2: 0, s2: 0, rot: 0, dx: 0, dy: 0, w: 0, ws: 0 };
const KEYS = Object.keys(ZERO) as (keyof Pose)[];

/** A full pose from a base pose and the joints that differ. */
export function pose(base: PoseInput, change: PoseInput = {}): Pose {
  return { ...ZERO, ...base, ...change };
}

/** Keyframes: [frame, pose]. Poses between keyframes are blended. */
export type Anim = [number, Pose][];

/** The pose at `frame`. With `loop`, the animation repeats over its last keyframe's frame count. */
export function sample(anim: Anim, frame: number, loop = false): Pose {
  if (anim.length === 1) return anim[0][1];
  const last = anim[anim.length - 1][0];
  let f = frame;
  if (loop && last > 0) f = f - last * Math.floor(f / last);
  if (f <= anim[0][0]) return anim[0][1];
  if (f >= last) return anim[anim.length - 1][1];
  let i = 0;
  while (anim[i + 1][0] < f) i++;
  const [fa, pa] = anim[i];
  const [fb, pb] = anim[i + 1];
  const k = (f - fa) / (fb - fa);
  const out = {} as Pose;
  for (const key of KEYS) out[key] = pa[key] + (pb[key] - pa[key]) * k;
  return out;
}

export interface Body {
  torso: number;
  upper: number;
  fore: number;
  thigh: number;
  shin: number;
  head: number;
  /** Weapon length from the front hand (0 = none). */
  weapon: number;
  /** Hurtbox radii (armR: the arms, if different from the other limbs). */
  torsoR: number;
  limbR: number;
  armR?: number;
}

/** Joint positions in world space. */
export interface Joints {
  hip: [number, number];
  neck: [number, number];
  head: [number, number];
  elbow1: [number, number];
  hand1: [number, number];
  elbow2: [number, number];
  hand2: [number, number];
  knee1: [number, number];
  foot1: [number, number];
  knee2: [number, number];
  foot2: [number, number];
  /** Weapon tip (the front hand when there is no weapon). */
  tip: [number, number];
}

export type JointName = keyof Joints;

/** Unit direction for an angle, facing right. */
function dir(theta: number): [number, number] {
  return [dsin(theta), -dcos(theta)];
}

/** How far the hip sits above the feet, standing straight. Air poses hold the hip here, above the bottom of the body. */
export function airHip(b: Body) {
  return (b.thigh + b.shin) * 0.82;
}

/**
 * Solves a pose into world positions.
 * (x, y) is the bottom centre of the fighter. Grounded poses put the lowest foot on y.
 */
export function solve(b: Body, p: Pose, x: number, y: number, facing: number, grounded: boolean): Joints {
  const add = (o: [number, number], len: number, theta: number): [number, number] => {
    const d = dir(theta + p.rot);
    return [o[0] + d[0] * len, o[1] + d[1] * len];
  };
  // Local space: hip at the origin, facing right.
  const hip: [number, number] = [0, 0];
  const torsoTheta = 180 - p.lean;
  const neck = add(hip, b.torso, torsoTheta);
  const head = add(neck, b.head + 1.5, torsoTheta);
  const elbow1 = add(neck, b.upper, p.a1);
  const hand1 = add(elbow1, b.fore, p.f1);
  const elbow2 = add(neck, b.upper, p.a2);
  const hand2 = add(elbow2, b.fore, p.f2);
  const knee1 = add(hip, b.thigh, p.t1);
  const foot1 = add(knee1, b.shin, p.s1);
  const knee2 = add(hip, b.thigh, p.t2);
  const foot2 = add(knee2, b.shin, p.s2);
  const tip = b.weapon > 0 ? add(hand1, b.weapon * (1 - p.ws), p.f1 + p.w) : hand1;
  const local = { hip, neck, head, elbow1, hand1, elbow2, hand2, knee1, foot1, knee2, foot2, tip };

  // Rotation turns the body around its belly, not its hip.
  let cx = 0;
  let cy = 0;
  if (p.rot !== 0) {
    const plain = dir(torsoTheta);
    const turned = dir(torsoTheta + p.rot);
    cx = (plain[0] - turned[0]) * b.torso * 0.4;
    cy = (plain[1] - turned[1]) * b.torso * 0.4;
  }
  const hipY = grounded ? Math.max(-Math.min(foot1[1], foot2[1]) - cy, 0) : airHip(b);
  const ox = x + facing * (p.dx + cx);
  const oy = y + hipY + p.dy + cy;
  const out = {} as Joints;
  for (const k in local) {
    const v = local[k as JointName];
    out[k as JointName] = [ox + facing * v[0], oy + v[1]];
  }
  return out;
}

/** A capsule: a segment with a radius. A circle is a capsule whose ends are the same point. */
export type Capsule = [number, number, number, number, number];

/** Hurtboxes from the skeleton: head, torso, both arms and both legs. */
export function hurtboxes(b: Body, j: Joints): Capsule[] {
  const seg = (a: [number, number], c: [number, number], r: number): Capsule => [a[0], a[1], c[0], c[1], r];
  return [
    seg(j.head, j.head, b.head + 2),
    seg(j.hip, j.neck, b.torsoR),
    seg(j.neck, j.elbow1, b.armR ?? b.limbR),
    seg(j.elbow1, j.hand1, b.armR ?? b.limbR),
    seg(j.neck, j.elbow2, b.armR ?? b.limbR),
    seg(j.elbow2, j.hand2, b.armR ?? b.limbR),
    seg(j.hip, j.knee1, b.limbR + 1),
    seg(j.knee1, j.foot1, b.limbR),
    seg(j.hip, j.knee2, b.limbR + 1),
    seg(j.knee2, j.foot2, b.limbR),
  ];
}
