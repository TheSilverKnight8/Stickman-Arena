import { CHARS } from './chars';
import { clamp } from './fmath';
import { hurtboxes, sample, solve, type Capsule, type Joints, type Pose } from './skeleton';
import type { FighterState, HitDef, MoveDef } from './types';

// Where a fighter's body is right now: its pose, joints, hurtboxes and active
// hitboxes. Used by the simulation, the renderer and the CPU.

export function moveOf(f: FighterState): MoveDef | null {
  return f.act === 'move' && f.move ? CHARS[f.char].moves[f.move] : null;
}

/** The pose for the fighter's current state and frame. */
export function poseOf(f: FighterState): Pose | null {
  const a = CHARS[f.char].anims;
  switch (f.act) {
    case 'dead':
    case 'out':
      return null;
    case 'idle':
    case 'respawn':
      return sample(a.idle, f.t, true);
    case 'run':
      return sample(a.run, f.t, true);
    case 'squat':
      return sample(a.squat, f.t);
    case 'land':
      return sample(a.land, f.t);
    case 'dodge':
      return sample(a.dodge, f.t);
    case 'airdodge':
      return sample(a.airdodge, f.t);
    case 'hurt':
      return f.hitstun > 25 && f.kbSpeed > 6 ? sample(a.tumble, f.t, true) : sample(a.hurt, f.t, true);
    case 'air':
      if (f.jumpAnim < 22) return sample(a.djump, f.jumpAnim);
      return f.vy > 0 ? sample(a.rise, 0) : sample(a.fall, clamp(-f.vy * 1.5, 0, 10));
    case 'move': {
      const m = moveOf(f);
      return m ? sample(m.anim, f.t) : sample(a.idle, 0);
    }
  }
}

export function jointsOf(f: FighterState): Joints | null {
  const p = poseOf(f);
  if (!p) return null;
  const c = CHARS[f.char];
  const body = f.weaponOut ? { ...c.body, weapon: 0 } : c.body;
  return solve(body, p, f.x, f.y, f.facing, f.grounded);
}

/** Whether the fighter can be hit this frame. */
export function hittable(f: FighterState): boolean {
  if (f.act === 'dead' || f.act === 'out' || f.act === 'respawn' || f.invincible > 0) return false;
  if (f.act === 'dodge') return !(f.t >= SPOT_DODGE.from && f.t <= SPOT_DODGE.to);
  if (f.act === 'airdodge') return !(f.t >= AIR_DODGE.from && f.t <= AIR_DODGE.to);
  const m = moveOf(f);
  if (m?.intangible && f.t >= m.intangible[0] && f.t <= m.intangible[1]) return false;
  if (m?.hidden && f.t >= m.hidden[0] && f.t <= m.hidden[1]) return false;
  return true;
}

/** Hidden mid-teleport: not drawn. */
export function hidden(f: FighterState): boolean {
  const m = moveOf(f);
  return !!(m?.hidden && f.t >= m.hidden[0] && f.t <= m.hidden[1]);
}

export const SPOT_DODGE = { total: 24, from: 3, to: 17 };
export const AIR_DODGE = { total: 30, from: 3, to: 20 };

export function hurtOf(f: FighterState, j: Joints | null = jointsOf(f)): Capsule[] {
  if (!j) return [];
  return hurtboxes(CHARS[f.char].body, j);
}

/** A point on the body: a joint, or an offset from the hip (facing right). */
export function pointOf(f: FighterState, j: Joints, at: HitDef['at']): [number, number] {
  if (typeof at === 'string') return j[at];
  return [j.hip[0] + f.facing * at[0], j.hip[1] + at[1]];
}

export interface ActiveHit {
  def: HitDef;
  shape: Capsule;
}

/** Hitboxes active on this frame of the current move. */
export function hitsOf(f: FighterState, j: Joints | null = jointsOf(f)): ActiveHit[] {
  const m = moveOf(f);
  if (!m?.hits || !j || hidden(f)) return [];
  const out: ActiveHit[] = [];
  for (const h of m.hits) {
    if (f.t < h.f[0] || f.t > h.f[1]) continue;
    // A hitbox on a fist or foot covers the forearm or shin too, so a point-blank hit still connects.
    const start = h.to ? h.at : ((typeof h.at === 'string' ? LIMB_BASE[h.at] : undefined) ?? h.at);
    const a = pointOf(f, j, start);
    const b = pointOf(f, j, h.to ?? h.at);
    out.push({ def: h, shape: [a[0], a[1], b[0], b[1], h.r] });
  }
  return out;
}

const LIMB_BASE: Partial<Record<string, HitDef['at']>> = { hand1: 'elbow1', hand2: 'elbow2', foot1: 'knee1', foot2: 'knee2' };

/** The reflect circle, when the current move has one active. */
export function reflectOf(f: FighterState, j: Joints | null = jointsOf(f)): [number, number, number] | null {
  const m = moveOf(f);
  if (!m?.reflect || !j || f.t < m.reflect.f[0] || f.t > m.reflect.f[1]) return null;
  return [j.hip[0] + f.facing * m.reflect.x, j.hip[1] + m.reflect.y, m.reflect.r];
}
