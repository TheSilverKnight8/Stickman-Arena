import { pose, type Anim, type Pose, type PoseInput } from '../skeleton';
import type { CharDef } from '../types';

// Standard animations every fighter has (idle, run, jump and so on), built
// from that character's stance so each one still moves in its own way.

export type BaseAnims = CharDef['anims'];

export interface StanceSet {
  /** Standing stance. */
  stand: PoseInput;
  /** In the air, not attacking. */
  air: PoseInput;
  /** How far the body leans while running. */
  runLean?: number;
  /** Arms while running (front, back). Defaults swing. */
  runArms?: [PoseInput, PoseInput];
  /** A small idle motion layered on the stance (second keyframe). */
  idleShift?: PoseInput;
  idleFrames?: number;
}

export function baseAnims(s: StanceSet): BaseAnims {
  const stand = pose(s.stand);
  const air = pose(s.air);
  const lean = s.runLean ?? 18;
  const [armA, armB] = s.runArms ?? [
    { a1: -35, f1: 30, a2: 60, f2: 120 },
    { a1: 60, f1: 120, a2: -35, f2: 30 },
  ];
  const strideA = pose(stand, { lean, t1: 48, s1: 15, t2: -38, s2: -75, ...armA });
  const passA = pose(stand, { lean, t1: 10, s1: -40, t2: -5, s2: -10, ...armA, dy: 3 });
  const strideB = pose(stand, { lean, t1: -38, s1: -75, t2: 48, s2: 15, ...armB });
  const passB = pose(stand, { lean, t1: -5, s1: -10, t2: 10, s2: -40, ...armB, dy: 3 });
  const crouch = pose(stand, { lean: (stand.lean ?? 0) + 14, t1: 62, s1: -12, t2: 34, s2: -52, a1: (stand.a1 ?? 0) - 15, a2: (stand.a2 ?? 0) - 15 });
  const rise = pose(air, { t1: 55, s1: -25, t2: -12, s2: -45 });
  const fall = pose(air, { t1: 28, s1: -2, t2: -18, s2: -28, a1: 115, f1: 135, a2: 95, f2: 120 });
  const hurt = pose(stand, { lean: -28, a1: 150, f1: 195, a2: -150, f2: -175, t1: 45, s1: 15, t2: -30, s2: -55, dx: 0 });
  const hurt2 = pose(hurt, { a1: 175, f1: 215, a2: -130, f2: -150, t1: 30, s1: -5 });
  const tuck = pose(air, { lean: 30, t1: 105, s1: -15, t2: 85, s2: -30, a1: 60, f1: 130, a2: 45, f2: 120 });
  const idleFrames = s.idleFrames ?? 48;
  return {
    idle: s.idleShift ? [[0, stand], [idleFrames / 2, pose(stand, s.idleShift)], [idleFrames, stand]] : [[0, stand]],
    run: [
      [0, strideA],
      [6, passA],
      [12, strideB],
      [18, passB],
      [24, strideA],
    ],
    squat: [[0, crouch]],
    rise: [[0, rise]],
    fall: [
      [0, rise],
      [10, fall],
    ],
    land: [
      [0, crouch],
      [6, stand],
    ],
    hurt: [
      [0, hurt],
      [6, hurt2],
      [12, hurt],
    ],
    tumble: [
      [0, pose(hurt, { rot: 0 })],
      [24, pose(hurt, { rot: 360 })],
    ],
    dodge: [
      [0, stand],
      [4, pose(crouch, { lean: -12, dx: -6 })],
      [18, pose(crouch, { lean: -12, dx: -6 })],
      [24, stand],
    ],
    airdodge: [
      [0, air],
      [4, tuck],
      [22, tuck],
      [30, air],
    ],
    djump: [
      [0, pose(tuck, { rot: 0 })],
      [16, pose(tuck, { rot: -360 })],
      [22, pose(rise, { rot: -360 })],
    ],
  };
}

/** Keyframes from [frame, base pose, changes] triples. */
export function keys(...frames: [number, Pose, PoseInput?][]): Anim {
  return frames.map(([f, base, change]) => [f, pose(base, change)]);
}

/** A pose aiming a bow (or a thrown object) at `aim` degrees: front arm straight out, back hand drawn to the chest. */
export function aimPose(base: Pose, aim: number, extra: PoseInput = {}): Pose {
  return pose(base, { a1: aim, f1: aim, a2: aim - 150, f2: aim + 15, ...extra });
}
