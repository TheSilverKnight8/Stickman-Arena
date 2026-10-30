import { random, type HasRng } from '../lib/rng';
import { hitsOf, moveOf } from './sim/body';
import { CHARS } from './sim/chars';
import { STAGES } from './sim/stages';
import { BOMB_FUSE, createMatch, projShape, step } from './sim/step';
import { BTN, type CharId, type FighterState, type MatchState, type MoveSlot } from './sim/types';

// The CPU opponent. It reads the match and presses the same buttons a player
// would. Difficulty changes how often it thinks, how aggressive it is, whether
// it dodges, whether it aims ahead of a moving target, and how reliably it
// recovers. It runs outside the simulation (CPU games are offline only).

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: Record<Difficulty, { name: string; about: string }> = {
  easy: { name: 'Easy', about: 'Slow to react, attacks now and then, often misses its recovery.' },
  normal: { name: 'Normal', about: 'Approaches and attacks in range, recovers, dodges sometimes.' },
  hard: { name: 'Hard', about: 'Reacts fast, aims ahead of you, dodges often, goes for KOs at high damage.' },
};

const LEVEL: Record<
  Difficulty,
  { think: number; aggression: number; dodge: number; recover: number; predict: boolean; wander: number; reach: number; ledgeWait: number; ledgeJump: number; jumpOver: number; hop: number }
> = {
  easy: { think: 16, aggression: 0.35, dodge: 0, recover: 0.55, predict: false, wander: 0.3, reach: 0.75, ledgeWait: 50, ledgeJump: 0.2, jumpOver: 0.3, hop: 0.03 },
  normal: { think: 8, aggression: 0.72, dodge: 0.12, recover: 0.95, predict: false, wander: 0.08, reach: 1, ledgeWait: 22, ledgeJump: 0.35, jumpOver: 0.6, hop: 0.08 },
  hard: { think: 3, aggression: 0.95, dodge: 0.38, recover: 1, predict: true, wander: 0, reach: 1, ledgeWait: 8, ledgeJump: 0.45, jumpOver: 0.6, hop: 0.12 },
};

/** Characters whose side special carries them sideways (useful for getting back to the stage). */
const SIDE_RECOVERY = new Set<CharId>(['fisticuffs', 'buster', 'phantom', 'valkyrie']);

/** How far each character likes to stay from its target. */
const PREFERRED: Record<CharId, number> = { fisticuffs: 35, spartan: 120, ranger: 360, buster: 70, phantom: 95, valkyrie: 45 };

/**
 * Characters that fight in the air: how often they jump in toward the target,
 * how close they drift in the air, and how near the target has to be before
 * they stop throwing their projectile and use aerials instead.
 */
const AERIAL: Partial<Record<CharId, { jumpIn: number; airDistance: number; projectileFrom?: number }>> = {
  phantom: { jumpIn: 0.5, airDistance: 40, projectileFrom: 200 },
  valkyrie: { jumpIn: 0.6, airDistance: 30 },
};

// ---------------------------------------------------------------- what each move covers

interface Reach {
  slot: MoveSlot;
  /** First active frame. */
  startup: number;
  /** Area covered, relative to the fighter's feet, facing right. */
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  dmg: number;
  kbg: number;
  air: boolean;
  special: boolean;
  /** Up or down held to aim the throw (the boomerang), or nothing. */
  aim?: number;
}

const SLOTS: MoveSlot[] = ['jab', 'ftilt', 'utilt', 'dtilt', 'nair', 'fair', 'uair', 'dair', 'nspec', 'sspec', 'uspec', 'dspec'];
const AIR = new Set<MoveSlot>(['nair', 'fair', 'uair', 'dair']);
const reachCache = new Map<CharId, Reach[]>();

function inputFor(slot: MoveSlot, facing: number) {
  const special = slot.endsWith('spec');
  let bits = special ? BTN.special : BTN.attack;
  if (slot.startsWith('u')) bits |= BTN.up;
  else if (slot.startsWith('d')) bits |= BTN.down;
  else if (slot === 'ftilt' || slot === 'fair' || slot === 'sspec') bits |= facing > 0 ? BTN.right : BTN.left;
  return bits;
}

/** Runs each move once on an empty stage and records where its hitboxes and projectiles go. */
function reachOf(char: CharId): Reach[] {
  const cached = reachCache.get(char);
  if (cached) return cached;
  const out: Reach[] = [];
  for (const slot of SLOTS) {
    const air = AIR.has(slot);
    const s = createMatch({ stage: 'flatline', chars: [char, char], seed: 1 });
    s.phase = 'play';
    const f = s.fighters[0];
    const dummy = s.fighters[1];
    dummy.act = 'dead';
    dummy.respawnIn = 1e9;
    f.x = 0;
    f.facing = 1;
    if (air) Object.assign(f, { grounded: false, surface: -1, act: 'air', y: 200 });
    let r: Reach | null = null;
    const m = CHARS[char].moves[slot];
    // A tether covers a strip straight out from the shoulder; what counts is the kick when it catches.
    if (m.tether) {
      const zip = CHARS[char].moves[m.tether.zip];
      const kick = zip.hits?.[0];
      const reach = m.tether.len;
      out.push({ slot, startup: m.tether.f[0] + 6, x1: 20, x2: reach, y1: air ? -30 : 30, y2: air ? 120 : 110, dmg: kick?.dmg ?? 0, kbg: kick?.kbg ?? 0, air, special: true });
      continue;
    }
    // Hitboxes are measured from where the move started (x = 0), so a move that carries the fighter
    // forward counts the ground it covers.
    // A bomb is followed until it goes off: what it covers is its blast, where it lands.
    let bombAt = -1;
    for (let fr = 0; fr < m.total + (bombAt >= 0 ? BOMB_FUSE + 30 : 30); fr++) {
      if (air) f.y = Math.max(f.y, 200);
      step(s, [fr === 0 ? inputFor(slot, 1) : 0, 0]);
      const baseY = air ? 200 : 0;
      if (bombAt >= 0) {
        const b = s.projectiles.find((q) => q.owner === 0 && q.kind === 'blast');
        if (b) {
          const R = projShape(b)[4];
          r = { slot, startup: bombAt + 6, x1: b.x - R, x2: b.x + R, y1: b.y - R - baseY, y2: b.y + R - baseY, dmg: b.dmg, kbg: b.kbg, air, special: slot.endsWith('spec') };
          break;
        }
        continue;
      }
      if (f.act !== 'move') break;
      for (const h of hitsOf(f)) {
        const [ax, ay, bx, by, rad] = h.shape;
        const box = { x1: Math.min(ax, bx) - rad, x2: Math.max(ax, bx) + rad, y1: Math.min(ay, by) - rad - baseY, y2: Math.max(ay, by) + rad - baseY };
        // A command grab is worth its throw.
        const th = h.def.grab ? CHARS[char].moves[h.def.grab].throw : undefined;
        const dmg = th ? th.dmg : h.def.dmg;
        const kbg = th ? th.kbg : h.def.kbg;
        if (!r) r = { slot, startup: f.t, ...box, dmg, kbg, air, special: slot.endsWith('spec') };
        else {
          r.x1 = Math.min(r.x1, box.x1);
          r.x2 = Math.max(r.x2, box.x2);
          r.y1 = Math.min(r.y1, box.y1);
          r.y2 = Math.max(r.y2, box.y2);
          r.dmg = Math.max(r.dmg, dmg);
          r.kbg = Math.max(r.kbg, kbg);
        }
      }
      const p = s.projectiles.find((q) => q.owner === 0);
      if (!r && p?.kind === 'bomb') bombAt = f.t;
      else if (!r && p) {
        // A projectile: covers a long strip along its path. (Measured along the real path instead, the CPU
        // threw Spartan's sword only at targets already in its way, and it made a fifth of the KOs.)
        const len = 520;
        const ux = p.vx / (Math.abs(p.vx) + Math.abs(p.vy) || 1);
        const uy = p.vy / (Math.abs(p.vx) + Math.abs(p.vy) || 1);
        const ex = p.x - f.x + ux * len;
        const ey = p.y - (air ? 200 : 0) + uy * len;
        const sx = p.x - f.x;
        const sy = p.y - (air ? 200 : 0);
        r = { slot, startup: f.t + 6, x1: Math.min(sx, ex) - 20, x2: Math.max(sx, ex) + 20, y1: Math.min(sy, ey) - 30, y2: Math.max(sy, ey) + 30, dmg: p.dmg, kbg: p.kbg, air, special: slot.endsWith('spec') };
      }
    }
    if (r) out.push(r);
    // A boomerang can be aimed: thrown 40 degrees up at targets above (or down, from the air, at targets
    // below), it covers them on the way out and again on the way back.
    if (r && m.aim && m.proj?.[0]?.kind === 'boomerang') {
      const sx = r.x1 + 20;
      const sy = r.y1 + 30;
      out.push({ ...r, x1: sx - 20, x2: sx + 300, y1: sy + 45, y2: sy + 300, aim: BTN.up });
      out.push({ ...r, x1: sx - 20, x2: sx + 300, y1: sy - 300, y2: sy - 45, aim: BTN.down });
    }
  }
  reachCache.set(char, out);
  return out;
}

// ---------------------------------------------------------------- getting back to the stage

/**
 * Whether using the side special now gets this fighter back, followed by its double jump and up special
 * the way the CPU uses them: tried out on an empty stage from where it is now. (Buster's Lunge Grab, for
 * one, drops him almost 200, too low for Rocket Leap to reach the ledge unless he starts high enough.)
 */
function sideSpecialGetsBack(me: FighterState): boolean {
  const s = createMatch({ stage: 'flatline', chars: [me.char, me.char], seed: 1 });
  s.phase = 'play';
  const f = s.fighters[0];
  s.fighters[1].act = 'dead';
  s.fighters[1].respawnIn = 1e9;
  const side = me.x >= 0 ? 1 : -1;
  Object.assign(f, { x: me.x, y: me.y, vx: me.vx, vy: me.vy, grounded: false, surface: -1, act: 'air', facing: -side, airJumps: me.airJumps, upSpecial: true });
  const toward = side > 0 ? BTN.left : BTN.right;
  for (let fr = 0; fr < 240; fr++) {
    let press = fr === 0 ? BTN.special : 0;
    if (fr > 0 && f.act === 'air' && f.vy < 0) {
      if (f.airJumps > 0 && f.y < 20) press = BTN.jump;
      else if (f.upSpecial && (f.y < -10 || (f.airJumps === 0 && f.y < 40))) press = BTN.special | BTN.up;
    }
    step(s, [press | toward, 0]);
    if (f.act === 'ledge' || f.grounded) return true;
    if (f.act === 'dead' || f.act === 'respawn' || f.y < -700) return false;
  }
  return false;
}

// ---------------------------------------------------------------- the CPU

export interface Cpu extends HasRng {
  level: Difficulty;
  /** Buttons held between decisions (directions, a held jump). */
  hold: number;
  /** A button to tap on the next frame. */
  tap: number;
  /** Frames until the next decision. */
  wait: number;
  /** Frames to keep jump held (for a full jump). */
  jumpHold: number;
  /** Recovery: up special / side special already attempted this trip. */
  triedUp: boolean;
  triedSide: boolean;
  /** Phantom: back off for a while after landing a hit. */
  retreat: number;
  /** An attack chosen on the ground (true) or in the air (false); null for other taps. */
  tapGround: boolean | null;
  /** The opponent being gone after (a slot, or -1). */
  target: number;
  /** Up or down to hold while an aimable throw leaves (the boomerang), or 0. */
  aimBits: number;
  /** For each fighter, how far it has kept from its nearest other fighter lately (campers keep far). */
  camp: number[];
}

export function createCpu(level: Difficulty, seed: number): Cpu {
  return { level, rng: seed | 0, hold: 0, tap: 0, wait: 0, jumpHold: 0, triedUp: false, triedSide: false, retreat: 0, tapGround: null, target: -1, camp: [], aimBits: 0 };
}

/**
 * Whether a fighter has to get back to the stage: off it in the air, gliding,
 * on or climbing from a ledge, or on the respawn platform.
 */
export function needsRecovery(s: MatchState, f: FighterState): boolean {
  if (f.act === 'ledge' || f.act === 'climb' || f.act === 'glide' || f.act === 'respawn') return true;
  const m = STAGES[s.stage].main;
  return !f.grounded && f.act !== 'hurt' && (f.x < m.x1 + 4 || f.x > m.x2 - 4 || f.y < -4);
}

/**
 * The CPU's buttons for this frame. With `recoverOnly` it only gets back to the
 * stage and off ledges, and otherwise does nothing (the training dummy).
 */
export function cpuInput(s: MatchState, slot: number, cpu: Cpu, recoverOnly = false): number {
  const me = s.fighters[slot];
  const L = LEVEL[cpu.level];
  if (s.phase === 'play') watchCampers(s, cpu);
  if (s.phase !== 'play' || me.act === 'dead' || me.act === 'out') return 0;

  // Taps last exactly one frame; then the button is let go so the next press counts.
  let out = cpu.hold;
  if (cpu.tap) {
    // An attack chosen in the air is dropped if the fighter has landed since (and the other way round):
    // it would come out as a different move (an aerial picked from afar becoming a ground move).
    if (cpu.tapGround === null || cpu.tapGround === me.grounded) out |= cpu.tap;
    cpu.tap = 0;
    cpu.tapGround = null;
  }
  if (cpu.jumpHold > 0) {
    cpu.jumpHold--;
    out |= BTN.jump;
  }
  // The CPU does not aim Ranger's Charged Shot (measured: its aimed shots missed more than they hit),
  // so up or down held for other reasons is let go while an aimable shot starts; it does aim the
  // boomerang (up at targets above, down from the air at targets below), held in `aimBits`.
  const aimable = me.act === 'move' && !!me.move && !!CHARS[me.char].moves[me.move].aim;
  if (cpu.retreat > 0) cpu.retreat--;
  // A new trip gets new tries: on landing, and when hit or on a ledge (both give the up special back).
  if (me.grounded || me.act === 'hurt' || me.act === 'held' || me.act === 'ledge') {
    cpu.triedUp = false;
    cpu.triedSide = false;
  }
  if (--cpu.wait > 0) return aimable ? (out & ~(BTN.up | BTN.down)) | cpu.aimBits : out;
  cpu.wait = L.think;
  cpu.hold = 0;
  decide(s, me, cpu, recoverOnly);
  const bits = cpu.hold | (out & (BTN.attack | BTN.special | BTN.dodge | BTN.jump));
  return aimable ? (bits & ~(BTN.up | BTN.down)) | cpu.aimBits : bits;
}

function decide(s: MatchState, me: FighterState, cpu: Cpu, recoverOnly: boolean) {
  const L = LEVEL[cpu.level];
  const st = STAGES[s.stage];
  const r = () => random(cpu);
  const toward = (x: number) => (x > me.x ? BTN.right : BTN.left);

  if (me.act === 'respawn') {
    cpu.hold = toward(0);
    return;
  }
  if (me.act === 'hurt' || me.act === 'held' || me.hitlag > 0) return;

  // Gliding (Valkyrie): dive onto the stage once over it; facing away from it, end the glide, while still
  // over the stage if a dive (about 5.5 forward for every 7 down) would carry her past the edge.
  if (me.act === 'glide') {
    const onStage = (x: number) => x > st.main.x1 + 20 && x < st.main.x2 - 20;
    const towardStage = -me.x * me.facing > 0;
    const diveLands = onStage(me.x + me.facing * Math.max(0, me.y) * (5.5 / 7));
    if (onStage(me.x) && (towardStage || diveLands)) cpu.hold = BTN.down;
    else if (!towardStage) cpu.tap = me.airJumps > 0 ? BTN.jump : BTN.dodge;
    cpu.wait = Math.min(cpu.wait, 2);
    return;
  }

  // On a ledge: wait a moment with the stick let go, then climb or jump up.
  if (me.act === 'ledge') {
    if (me.t < L.ledgeWait + Math.floor(r() * 12)) return;
    if (r() < L.ledgeJump) {
      cpu.tap = BTN.jump;
      cpu.jumpHold = 6;
    } else cpu.hold = toward(0);
    return;
  }
  if (me.act === 'climb') return;

  // Recovery: get back to the stage. Drift in first, cover distance with a
  // moving side special when far out, save the double jump until near stage
  // height, and use the up special once below it. Below the top of the stage,
  // aim just outside the ledge, not at the middle, so as not to drift in under it.
  const off = me.x < st.main.x1 + 4 || me.x > st.main.x2 - 4;
  if (!me.grounded && (off || me.y < -4)) {
    const side = me.x >= 0 ? 1 : -1;
    const center = me.y < -10 ? (side > 0 ? st.main.x2 : st.main.x1) + side * (CHARS[me.char].halfWidth + 8) : 0;
    const gap = Math.abs(me.x) - st.main.x2;
    cpu.hold = Math.abs(me.x - center) > 6 ? toward(center) : 0;
    // Presses only once free to act: one made during a move (a side special covering distance) would do
    // nothing and still use up the try.
    if (me.vy < 0 && me.act === 'air') {
      if (gap > 140 && SIDE_RECOVERY.has(me.char) && !cpu.triedSide && r() < L.recover && sideSpecialGetsBack(me)) {
        cpu.triedSide = true;
        cpu.tap = BTN.special;
      } else if (me.airJumps > 0 && me.y < 20) {
        cpu.tap = BTN.jump;
      } else if (me.upSpecial && !cpu.triedUp && (me.y < -10 || (me.airJumps === 0 && me.y < 40))) {
        cpu.triedUp = true;
        // Easy sometimes forgets.
        if (r() < L.recover) {
          cpu.tap = BTN.special;
          // An up special that turns to the held direction (Shuttle Loop) always faces the stage, or it
          // would loop and glide away from it after a side special out past the edge.
          const turns = CHARS[me.char].moves.uspec.turn;
          cpu.hold = BTN.up | (turns ? toward(0) : gap > 60 ? toward(center) : 0);
        }
      }
    }
    cpu.wait = Math.min(cpu.wait, 2);
    return;
  }
  if (recoverOnly) return;

  const target = chooseTarget(s, me, cpu);
  if (!target) return;
  const dx = target.x - me.x;
  const dy = target.y - me.y;
  const face = dx >= 0 ? 1 : -1;

  // Dodge an attack that is about to land.
  const tm = moveOf(target);
  if (tm && Math.abs(dx) < 170 && Math.abs(dy) < 130 && r() < L.dodge) {
    const active = tm.hits?.some((h) => h.f[0] >= target.t && h.f[0] - target.t <= 8);
    if (active) {
      cpu.tap = BTN.dodge;
      return;
    }
  }

  // Jump over a boulder or shockwave rolling this way along the floor.
  if (me.grounded && incomingFloorShot(s, me) && r() < L.jumpOver) {
    cpu.hold = 0;
    cpu.tap = BTN.jump;
    cpu.jumpHold = 6;
    return;
  }

  // Easy wanders now and then.
  if (r() < L.wander) {
    cpu.hold = r() < 0.5 ? BTN.left : BTN.right;
    if (r() < 0.2) cpu.tap = BTN.jump;
    return;
  }

  // Pick an attack that would reach the target, only when free to act: a press made during another move or
  // landing would wait in the buffer and come out later, as whatever the held direction then makes it.
  const free = me.act === 'idle' || me.act === 'run' || me.act === 'air';
  if (free && r() < L.aggression && cpu.retreat === 0) {
    const pick = chooseMove(me, target, face, cpu, me.facing);
    if (pick) {
      const bits = inputFor(pick.slot, face);
      cpu.tap = bits & (BTN.attack | BTN.special);
      cpu.tapGround = me.grounded;
      cpu.aimBits = pick.aim ?? 0;
      cpu.hold = bits & (BTN.left | BTN.right | BTN.up | BTN.down);
      // Phantom hits and runs.
      if (me.char === 'phantom') cpu.retreat = 24;
      return;
    }
    // Facing away on the ground, with a move that would reach if turned around: turn now, attack next time.
    if (me.grounded && me.facing !== face && (me.act === 'idle' || me.act === 'run') && chooseMove(me, target, face, cpu, face)) {
      cpu.hold = toward(target.x);
      cpu.wait = Math.min(cpu.wait, 2);
      return;
    }
  }

  const dist = Math.abs(dx);
  // Air fighters jump in to use their aerials (a short hop when close, a full jump when further).
  const air = AERIAL[me.char];
  if (air && me.grounded && cpu.retreat === 0 && dist > 50 && dist < 300 && Math.abs(dy) < 120 && r() < air.jumpIn * L.aggression) {
    cpu.hold = toward(target.x);
    cpu.tap = BTN.jump;
    cpu.jumpHold = dist > 170 ? 6 : 0;
    return;
  }

  // Move to a comfortable distance.
  const want = air && !me.grounded ? air.airDistance : PREFERRED[me.char];
  const edge = st.main.x2 - 50;
  let move = 0;
  if (cpu.retreat > 0 || dist < want - 70) move = -face;
  else if (dist > want + 25) move = face;
  // Never walk off the stage on purpose.
  if (me.grounded && move !== 0 && Math.abs(me.x + move * 40) > edge) move = 0;
  if (move !== 0) cpu.hold |= move > 0 ? BTN.right : BTN.left;
  // Now and then jump in instead of walking up.
  if (me.grounded && move === face && dist > 80 && dist < 260 && r() < L.hop) {
    cpu.tap = BTN.jump;
    cpu.jumpHold = r() < 0.5 ? 6 : 0;
  }

  // Jump toward targets above.
  if (me.grounded && dy > 90 && dist < 260 && r() < 0.5) {
    cpu.tap = BTN.jump;
    cpu.jumpHold = 6;
  }
  // Come back down to fight.
  if (!me.grounded && dy < -60 && me.vy < 0 && !me.fastFall && cpu.level === 'hard') cpu.hold |= BTN.down;
}

/** A boulder or shockwave rolling along the floor toward this fighter, arriving in the next few frames. */
function incomingFloorShot(s: MatchState, me: FighterState) {
  return s.projectiles.some((p) => {
    if (p.owner === me.slot || (p.kind !== 'boulder' && p.kind !== 'shock') || p.vx === 0) return false;
    if (Math.abs(p.y - me.y) > 60) return false;
    // Frames until it reaches this fighter, counting this fighter's own movement toward it.
    const closing = p.vx - me.vx;
    if (closing === 0) return false;
    const frames = (me.x - p.x) / closing;
    return frames > 2 && frames < 22;
  });
}

/** How long the camping measure remembers (frames), how far counts as keeping away, and how much it pulls. */
const CAMP_MEMORY = 120;
const CAMP_FROM = 200;
const CAMP_PULL = 2;
/** A new target has to be this much better before the CPU switches. */
const TARGET_STICK = 60;

/** Follows how far each fighter keeps from its nearest other fighter. */
function watchCampers(s: MatchState, cpu: Cpu) {
  for (const f of s.fighters) {
    if (f.act === 'dead' || f.act === 'out' || f.act === 'respawn') continue;
    let near = Infinity;
    for (const o of s.fighters) {
      if (o === f || o.act === 'dead' || o.act === 'out' || o.act === 'respawn') continue;
      near = Math.min(near, Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 0.5);
    }
    if (near === Infinity) continue;
    const was = cpu.camp[f.slot] ?? near;
    cpu.camp[f.slot] = was + (near - was) / CAMP_MEMORY;
  }
}

/**
 * The opponent to go after: the nearest, except that one who has kept away from
 * everyone lately (a camper) counts as nearer, so it does not get left alone.
 * The CPU keeps its target unless another is clearly better.
 */
function chooseTarget(s: MatchState, me: FighterState, cpu: Cpu) {
  let best: FighterState | null = null;
  let bestScore = Infinity;
  let current = Infinity;
  for (const f of s.fighters) {
    if (f === me || f.act === 'dead' || f.act === 'out' || f.act === 'respawn') continue;
    const d = Math.abs(f.x - me.x) + Math.abs(f.y - me.y);
    const score = d - CAMP_PULL * Math.max(0, (cpu.camp[f.slot] ?? 0) - CAMP_FROM);
    if (f.slot === cpu.target) current = score;
    if (score < bestScore) {
      bestScore = score;
      best = f;
    }
  }
  if (best && current !== Infinity && current - bestScore < TARGET_STICK) best = s.fighters[cpu.target];
  cpu.target = best ? best.slot : -1;
  return best;
}

/** Side moves that turn to the held direction when they start. */
const SIDE = new Set<MoveSlot>(['ftilt', 'fair', 'sspec']);

/**
 * The best move that would reach the target, judged by the way each move will
 * actually go: a side move that turns goes toward the target (`face`); every
 * other move, projectiles included, goes the way the fighter faces (`facing`).
 */
function chooseMove(me: FighterState, target: FighterState, face: number, cpu: Cpu, facing: number): Reach | null {
  const L = LEVEL[cpu.level];
  const c = CHARS[me.char];
  let best: Reach | null = null;
  let bestScore = -Infinity;
  for (const rch of reachOf(me.char)) {
    if (rch.air !== !me.grounded && !rch.special) continue;
    if (rch.slot === 'uspec' && !me.upSpecial) continue;
    if (rch.aim === BTN.down && me.grounded) continue;
    // The up special is for getting back, or for finishing a combo (the target still stunned from this
    // fighter's hit), never thrown out raw (Caleb's rule after the CPU study).
    if (rch.slot === 'uspec' && !(target.act === 'hurt' && target.lastHitBy === me.slot)) continue;
    const m = c.moves[rch.slot];
    if (m.needsWeapon && me.weaponOut) continue;
    // Air fighters keep the projectile for targets further away; closer in, they jump in instead.
    const air = AERIAL[me.char];
    if (air?.projectileFrom && rch.slot === 'nspec' && Math.abs(target.x - me.x) < air.projectileFrom) continue;
    // Where the target will be when the move comes out.
    const ahead = L.predict ? rch.startup : 0;
    const tx = target.x + (target.vx + target.kbSpeed * target.kbX) * ahead - me.x;
    const ty = target.y + 40 + (target.grounded ? 0 : target.vy * ahead) - me.y;
    const rx = tx * (m.turn && SIDE.has(rch.slot) ? face : facing);
    const margin = 8;
    const reach = L.reach;
    if (rx < rch.x1 * reach - margin || rx > rch.x2 * reach + margin || ty < rch.y1 - margin - 40 || ty > rch.y2 + margin) continue;
    // Damage (more for a KO move once the target is past 100%), less for slow starts and for long moves
    // that leave the fighter open: a big slow move is mostly a finisher, not something to throw out all the time.
    const killing = target.damage > 100 ? rch.kbg / 40 : 0;
    const length = m.total + (m.onLand ? c.moves[m.onLand].total : 0);
    const score = rch.dmg * (1 + killing) - rch.startup * 0.6 - length * 0.15 + random(cpu) * 5 - (rch.slot === 'uspec' ? 8 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = rch;
    }
  }
  return best;
}
