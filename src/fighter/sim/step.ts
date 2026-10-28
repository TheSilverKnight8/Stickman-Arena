import { CHARS } from './chars';
import { AIR_DODGE, SPOT_DODGE, hitsOf, hittable, hurtOf, jointsOf, moveOf, reflectOf } from './body';
import { approach, dcos, dsin, segSegDist2 } from './fmath';
import type { Capsule } from './skeleton';
import { STAGES } from './stages';
import {
  BTN,
  type Act,
  type CharId,
  type FighterState,
  type HitDef,
  type MatchState,
  type MoveDef,
  type MoveSlot,
  type ProjKind,
  type ProjSpawn,
  type ProjectileState,
  type SimEvent,
  type StageId,
} from './types';

// The Platfighter simulation. step() advances a match by one frame (1/60 s)
// from that frame's inputs. It only uses the state it is given and the fixed
// data in chars/ and stages.ts, and only exact arithmetic (see fmath.ts), so
// the same inputs always give the same result on every device. That is what
// rollback netcode needs: a match can be copied, rewound and replayed.

export const FPS = 60;
export const MATCH_FRAMES = 3 * 60 * FPS;
export const SUDDEN_FRAMES = 60 * FPS;
export const SUDDEN_DAMAGE = 300;
export const STOCKS = 3;
export const COUNTDOWN_FRAMES = 180;
const SUDDEN_INTRO = 120;
/** Button presses are remembered this many frames, so a press slightly early still counts. */
const BUFFER = 6;
/** Knockback → launch speed, launch slowdown per frame, knockback → hitstun frames. */
const LAUNCH = 0.18;
const KB_DECAY = 0.3;
const HITSTUN = 0.4;
const RESPAWN_DELAY = 60;
const RESPAWN_WAIT = 150;
const RESPAWN_INVINCIBLE = 120;
const RESPAWN_Y = 330;
const RESPAWN_X = [-80, 80, -160, 160];
const LAND_LAG = 4;
const AIRDODGE_LAND_LAG = 8;
const HURT_LAND_LAG = 14;
/** Hitting the side of the stage this close below its top steps up onto it. */
const STEP_UP = 26;
const UNTIL_LAND_MAX = 45;
const PROJ_R: Record<ProjKind, number> = { arrow: 7, sword: 18, orb: 13, boulder: 22, shock: 14 };
const PROJ_LIFE: Record<ProjKind, number> = { arrow: 80, sword: 140, orb: 110, boulder: 240, shock: 30 };
const REFLECTABLE: ProjKind[] = ['arrow', 'orb', 'boulder'];

const DIRS = BTN.left | BTN.right | BTN.up | BTN.down;
const ACTIONS = BTN.attack | BTN.special | BTN.jump | BTN.dodge;

// ---------------------------------------------------------------- setup

export interface MatchConfig {
  stage: StageId;
  chars: CharId[];
  seed: number;
}

export function createMatch(cfg: MatchConfig): MatchState {
  const st = STAGES[cfg.stage];
  const fighters = cfg.chars.map((char, slot) => {
    // A second copy of the same character gets the alternate colours.
    const palette = cfg.chars.slice(0, slot).filter((c) => c === char).length;
    const [x, y] = st.spawns[slot];
    return newFighter(slot, char, palette, x, y);
  });
  return {
    frame: 0,
    rng: cfg.seed | 0,
    stage: cfg.stage,
    phase: 'countdown',
    phaseT: 0,
    clock: MATCH_FRAMES,
    suddenDeath: false,
    fighters,
    projectiles: [],
    nextId: 1,
    winner: null,
    endReason: null,
  };
}

function newFighter(slot: number, char: CharId, palette: number, x: number, y: number): FighterState {
  return {
    slot,
    char,
    palette,
    x,
    y,
    vx: 0,
    vy: 0,
    kbSpeed: 0,
    kbX: 0,
    kbY: 0,
    facing: x <= 0 ? 1 : -1,
    act: 'idle',
    t: 0,
    move: null,
    grounded: true,
    surface: 0,
    doubleJump: true,
    upSpecial: true,
    airDodge: true,
    fastFall: false,
    shortHop: false,
    damage: 0,
    stocks: STOCKS,
    hitstun: 0,
    hitlag: 0,
    landLag: 0,
    invincible: 0,
    respawnIn: 0,
    dropT: 0,
    downHeld: 0,
    prev: 0,
    buf: 0,
    bufT: 0,
    bufDir: 0,
    hitLog: [],
    charge: 0,
    weaponOut: false,
    lastHitBy: -1,
    tpX: 0,
    tpY: 0,
    jumpAnim: 99,
    halted: false,
  };
}

// ---------------------------------------------------------------- one frame

/** Advances the match by one frame. `inputs[slot]` is that player's buttons (BTN bits). Returns what happened, for sound and effects. */
export function step(s: MatchState, inputs: number[]): SimEvent[] {
  const ev: SimEvent[] = [];
  s.frame++;

  if (s.phase === 'over') {
    s.phaseT++;
    return ev;
  }
  if (s.phase === 'sudden-intro') {
    if (++s.phaseT >= SUDDEN_INTRO) startSuddenDeath(s);
    return ev;
  }
  if (s.phase === 'countdown') {
    if (s.phaseT % 60 === 0) ev.push({ type: 'count', n: 3 - s.phaseT / 60 });
    s.phaseT++;
    // Nobody moves before "Go", but held buttons are noted so they don't fire on the first frame.
    for (const f of s.fighters) {
      f.prev = inputs[f.slot] ?? 0;
      if (f.act !== 'out') updateFighter(s, f, 0, ev, true);
    }
    if (s.phaseT >= COUNTDOWN_FRAMES) {
      s.phase = 'play';
      s.phaseT = 0;
      ev.push({ type: 'go' });
    }
    return ev;
  }

  // Playing.
  s.phaseT++;
  const aliveBefore = s.fighters.filter((f) => f.act !== 'out').map((f) => f.slot);
  for (const f of s.fighters) updateFighter(s, f, inputs[f.slot] ?? 0, ev, false);
  resolveHits(s, ev);
  updateProjectiles(s, ev);
  for (const f of s.fighters) checkBlast(s, f, ev);

  s.clock--;
  if (s.clock > 0 && s.clock <= 600 && s.clock % 60 === 0) ev.push({ type: 'tick', seconds: s.clock / 60 });

  const alive = s.fighters.filter((f) => f.act !== 'out');
  if (s.fighters.length >= 2 && alive.length <= 1) {
    if (alive.length === 1) finish(s, alive[0].slot, 'stocks', ev);
    // Everyone left lost their last stock on the same frame.
    else if (s.suddenDeath) finish(s, -1, 'stocks', ev);
    else beginSuddenDeath(s, aliveBefore, ev);
  } else if (s.clock <= 0) {
    if (s.suddenDeath) finish(s, -1, 'sudden-time', ev);
    else {
      const most = Math.max(...alive.map((f) => f.stocks));
      const leaders = alive.filter((f) => f.stocks === most).map((f) => f.slot);
      if (leaders.length === 1) finish(s, leaders[0], 'time', ev);
      else beginSuddenDeath(s, leaders, ev);
    }
  }
  return ev;
}

function finish(s: MatchState, winner: number, reason: MatchState['endReason'], ev: SimEvent[]) {
  s.phase = 'over';
  s.phaseT = 0;
  s.winner = winner;
  s.endReason = reason;
  ev.push({ type: 'game' });
}

/** Ends a match early (a player left or lost connection): a draw. */
export function endInDraw(s: MatchState) {
  s.phase = 'over';
  s.phaseT = 0;
  s.winner = -1;
  s.endReason = 'disconnect';
}

function beginSuddenDeath(s: MatchState, slots: number[], ev: SimEvent[]) {
  s.phase = 'sudden-intro';
  s.phaseT = 0;
  for (const f of s.fighters) if (!slots.includes(f.slot)) f.act = 'out';
  s.fighters.forEach((f) => {
    if (slots.includes(f.slot)) f.stocks = 1;
  });
  ev.push({ type: 'sudden' });
}

function startSuddenDeath(s: MatchState) {
  const st = STAGES[s.stage];
  s.projectiles = [];
  for (const f of s.fighters) {
    if (f.act === 'out' && f.stocks !== 1) continue;
    const [x, y] = st.spawns[f.slot];
    const fresh = newFighter(f.slot, f.char, f.palette, x, y);
    Object.assign(f, fresh, { stocks: 1, damage: SUDDEN_DAMAGE });
  }
  s.suddenDeath = true;
  s.clock = SUDDEN_FRAMES;
  s.phase = 'countdown';
  s.phaseT = 0;
}

// ---------------------------------------------------------------- fighters

function enter(f: FighterState, act: Act) {
  f.act = act;
  f.t = 0;
  if (act !== 'move') f.move = null;
}

function updateFighter(s: MatchState, f: FighterState, input: number, ev: SimEvent[], frozen: boolean) {
  const c = CHARS[f.char];
  const press = input & ~f.prev;
  if (!frozen) f.prev = input;
  if (press & ACTIONS) {
    f.buf = press & ACTIONS;
    f.bufT = BUFFER;
    f.bufDir = input & DIRS;
  } else if (f.bufT > 0 && --f.bufT === 0) f.buf = 0;

  if (f.act === 'out') return;
  if (f.act === 'dead') {
    if (--f.respawnIn <= 0) respawn(f, ev);
    return;
  }
  if (f.hitlag > 0) {
    f.hitlag--;
    return;
  }
  if (f.invincible > 0) f.invincible--;
  if (f.dropT > 0) f.dropT--;
  if (f.jumpAnim < 99) f.jumpAnim++;
  f.t++;

  const dirX = (input & BTN.right ? 1 : 0) - (input & BTN.left ? 1 : 0);

  // ---- state logic
  switch (f.act) {
    case 'respawn':
      if (input !== 0 || f.t >= RESPAWN_WAIT) {
        enter(f, 'air');
        f.invincible = RESPAWN_INVINCIBLE;
        f.buf = 0;
      } else return;
      break;
    case 'hurt':
      if (--f.hitstun <= 0) enter(f, f.grounded ? 'idle' : 'air');
      break;
    case 'squat':
      if (!(input & BTN.jump)) f.shortHop = true;
      if (f.t >= c.stats.squat) {
        f.vy = f.shortHop ? c.stats.shortHop : c.stats.jump;
        leaveGround(f);
        enter(f, 'air');
        ev.push({ type: 'jump', slot: f.slot, double: false });
      }
      break;
    case 'land':
      if (f.t >= f.landLag) enter(f, 'idle');
      break;
    case 'dodge':
      if (f.t >= SPOT_DODGE.total) enter(f, 'idle');
      break;
    case 'airdodge':
      if (f.t >= AIR_DODGE.total) enter(f, 'air');
      break;
    case 'move':
      advanceMove(s, f, input, ev);
      break;
  }

  if (f.act === 'idle' || f.act === 'run' || f.act === 'air') {
    if (!frozen) tryActions(s, f, input, ev);
  }

  // ---- movement
  const st = c.stats;
  const m = moveOf(f);
  if (f.grounded) {
    f.vy = 0;
    if (f.act === 'idle' || f.act === 'run') {
      if (dirX !== 0 && !frozen) {
        if (f.act !== 'run') enter(f, 'run');
        f.facing = dirX as 1 | -1;
        f.vx = approach(f.vx, dirX * st.run, st.groundAccel);
      } else {
        if (f.act === 'run') enter(f, 'idle');
        f.vx = approach(f.vx, 0, st.friction);
      }
      // Hold down on a platform to drop through it.
      if (f.surface > 0 && input & BTN.down && !frozen) {
        if (++f.downHeld >= 3) {
          leaveGround(f);
          f.dropT = 14;
          f.vy = -2;
          enter(f, 'air');
        }
      } else f.downHeld = 0;
    } else if (f.act !== 'squat') {
      f.vx = approach(f.vx, 0, st.friction);
    }
  } else {
    let g = st.gravity;
    if (m?.gravity && f.t >= m.gravity.f[0] && f.t <= m.gravity.f[1]) g *= m.gravity.mul;
    if (m?.teleport && f.t >= m.teleport.f && f.t <= m.teleport.f + 3) g = 0;
    f.vy -= g;
    const cap = f.fastFall ? st.fastFall : st.maxFall;
    if (f.vy < -cap) f.vy = -cap;
    const canDrift = f.act === 'air' || (f.act === 'move' && (m?.drift ?? 1) > 0 && !(m?.teleport && f.t >= m.teleport.f && f.t <= m.teleport.f + 3));
    if (canDrift && dirX !== 0 && !frozen) {
      const k = f.act === 'move' ? (m?.drift ?? 1) : 1;
      // Drifting never slows a fighter who is already moving faster that way (after a dash or a run).
      if (dirX * f.vx < st.air * k) f.vx = approach(f.vx, dirX * st.air * k, st.airAccel * k);
    } else if (f.act !== 'hurt') f.vx = approach(f.vx, 0, st.airFriction);
    // Tap down to fall faster (not while launched).
    const aerial = f.act === 'air' || (f.act === 'move' && m?.landLag !== undefined);
    if (aerial && press & BTN.down && !frozen && f.vy <= 0 && !f.fastFall) {
      f.fastFall = true;
      f.vy = -st.fastFall;
    }
  }

  // ---- position, launch, collision
  const prevX = f.x;
  const prevY = f.y;
  let kx = 0;
  let ky = 0;
  if (f.kbSpeed > 0) {
    kx = f.kbSpeed * f.kbX;
    ky = f.kbSpeed * f.kbY;
    f.kbSpeed = Math.max(0, f.kbSpeed - KB_DECAY);
  }
  f.x += f.vx + kx;
  if (!f.grounded) f.y += f.vy + ky;
  collide(s, f, prevX, prevY, ev);
}

function leaveGround(f: FighterState) {
  f.grounded = false;
  f.surface = -1;
}

function respawn(f: FighterState, ev: SimEvent[]) {
  const fresh = newFighter(f.slot, f.char, f.palette, RESPAWN_X[f.slot] ?? 0, RESPAWN_Y);
  Object.assign(f, fresh, { stocks: f.stocks, prev: f.prev, act: 'respawn' as Act, grounded: false, surface: -1 });
  ev.push({ type: 'respawn', slot: f.slot });
}

function tryActions(s: MatchState, f: FighterState, input: number, ev: SimEvent[]) {
  const b = f.buf;
  if (!b) return;
  const c = CHARS[f.char];
  const dir = input & DIRS || f.bufDir;
  const side = (dir & BTN.right ? 1 : 0) - (dir & BTN.left ? 1 : 0);
  const up = !!(dir & BTN.up);
  const down = !!(dir & BTN.down);

  if (b & BTN.jump && f.grounded) {
    // Leave the attack/special buttons buffered: pressing them during the squat gives an aerial right away.
    f.buf &= ~BTN.jump;
    f.shortHop = false;
    enter(f, 'squat');
    return;
  }
  if (b & BTN.special) {
    const slot: MoveSlot = up ? 'uspec' : down ? 'dspec' : side !== 0 ? 'sspec' : 'nspec';
    if (canStart(s, f, slot)) return startMove(s, f, slot, input, side, ev);
  }
  if (b & BTN.attack) {
    const slot: MoveSlot = f.grounded ? (up ? 'utilt' : down ? 'dtilt' : side !== 0 ? 'ftilt' : 'jab') : up ? 'uair' : down ? 'dair' : side !== 0 ? 'fair' : 'nair';
    if (canStart(s, f, slot)) return startMove(s, f, slot, input, side, ev);
  }
  if (b & BTN.dodge) {
    if (f.grounded) {
      f.buf = 0;
      enter(f, 'dodge');
      ev.push({ type: 'dodge', slot: f.slot });
      return;
    }
    if (f.airDodge) {
      f.buf = 0;
      f.airDodge = false;
      enter(f, 'airdodge');
      ev.push({ type: 'dodge', slot: f.slot });
      return;
    }
  }
  if (b & BTN.jump && !f.grounded && f.doubleJump) {
    f.buf &= ~BTN.jump;
    f.doubleJump = false;
    f.fastFall = false;
    f.vy = c.stats.doubleJump;
    if (side !== 0) f.vx = side * c.stats.air;
    f.jumpAnim = 0;
    ev.push({ type: 'jump', slot: f.slot, double: true });
  }
}

function canStart(s: MatchState, f: FighterState, slot: MoveSlot): boolean {
  const c = CHARS[f.char];
  const m = c.moves[slot];
  // Up special: once in the air, back on landing.
  if (slot === 'uspec' && !f.upSpecial) return false;
  if (m.needsWeapon && f.weaponOut) return false;
  // Moves that exist to throw something wait until the last one is gone.
  if (m.proj?.some((p) => p.kind === 'orb' || p.kind === 'boulder') && countProjectiles(s, f.slot) >= c.projLimit) return false;
  return true;
}

function countProjectiles(s: MatchState, owner: number) {
  let n = 0;
  for (const p of s.projectiles) if (p.owner === owner && p.kind !== 'shock') n++;
  return n;
}

function startMove(s: MatchState, f: FighterState, id: string, input: number, side: number, ev: SimEvent[]) {
  const m = CHARS[f.char].moves[id];
  f.buf = 0;
  f.bufT = 0;
  if (m.turn && side !== 0) f.facing = side as 1 | -1;
  if (id === 'uspec') f.upSpecial = false;
  enter(f, 'move');
  f.move = id;
  f.hitLog = [];
  f.charge = 0;
  f.halted = false;
  if (m.hits?.length) ev.push({ type: 'swing', slot: f.slot, heavy: m.hits.some((h) => h.dmg >= 12) });
  moveEffects(s, f, m, input, ev);
}

function advanceMove(s: MatchState, f: FighterState, input: number, ev: SimEvent[]) {
  const m = moveOf(f);
  if (!m) return enter(f, f.grounded ? 'idle' : 'air');
  // Charging: hold special to stay on the charge frame.
  if (m.charge && f.t - 1 === m.charge.at && input & BTN.special && f.charge < m.charge.max) {
    f.t--;
    f.charge++;
    return;
  }
  // Falling moves wait on their falling frame until they land.
  if (m.untilLand !== undefined && f.t - 1 === m.untilLand && !f.grounded && f.charge < UNTIL_LAND_MAX) {
    f.t--;
    f.charge++;
    return;
  }
  if (m.chain && f.t >= m.chain.window[0] && f.t <= m.chain.window[1] && f.buf & BTN.attack) {
    return startMove(s, f, m.chain.into, input, 0, ev);
  }
  if (f.t >= m.total) return enter(f, f.grounded ? 'idle' : 'air');
  moveEffects(s, f, m, input, ev);
}

/** Speed changes, projectiles and teleports on the current frame of a move. */
function moveEffects(s: MatchState, f: FighterState, m: MoveDef, input: number, ev: SimEvent[]) {
  const t = f.t;
  if (m.vel && !f.halted) {
    for (const v of m.vel) {
      if (v.f !== t) continue;
      if (v.when === 'ground' && !f.grounded) continue;
      if (v.when === 'air' && f.grounded) continue;
      if (v.vx !== undefined) f.vx = v.add ? f.vx + v.vx * f.facing : v.vx * f.facing;
      if (v.vy !== undefined) {
        f.vy = v.add ? f.vy + v.vy : v.vy;
        if (f.vy > 0 && f.grounded) leaveGround(f);
      }
    }
  }
  if (m.proj) for (const p of m.proj) if (p.f === t) spawnProjectile(s, f, m, p, ev);
  if (m.teleport) {
    const tp = m.teleport;
    if (t === tp.f) {
      let dx = (input & BTN.right ? 1 : 0) - (input & BTN.left ? 1 : 0);
      let dy = (input & BTN.up ? 1 : 0) - (input & BTN.down ? 1 : 0);
      if (dx === 0 && dy === 0) dy = 1;
      const k = dx !== 0 && dy !== 0 ? 0.7071067811865476 : 1;
      f.tpX = (dx * k * tp.dist) / 4;
      f.tpY = (dy * k * tp.dist) / 4;
      if (dx !== 0) f.facing = dx as 1 | -1;
      if (f.tpY > 0 && f.grounded) leaveGround(f);
      ev.push({ type: 'teleport', slot: f.slot, x: f.x, y: f.y });
    }
    if (t >= tp.f && t <= tp.f + 3) {
      f.vx = f.tpX;
      f.vy = f.grounded ? 0 : f.tpY;
    } else if (t === tp.f + 4) {
      f.vx = f.tpX * 0.12;
      f.vy = f.grounded ? 0 : f.tpY * 0.12;
    }
  }
}

// ---------------------------------------------------------------- stage collision

function collide(s: MatchState, f: FighterState, prevX: number, prevY: number, ev: SimEvent[]) {
  const st = STAGES[s.stage];
  const c = CHARS[f.char];
  const m = st.main;
  const hw = c.halfWidth;

  if (f.grounded) {
    const surf = f.surface === 0 ? { x1: m.x1, x2: m.x2, y: 0 } : st.plats[f.surface - 1];
    if (f.x < surf.x1 || f.x > surf.x2) {
      // Walked or slid off the edge.
      leaveGround(f);
      if (f.act === 'idle' || f.act === 'run' || f.act === 'land' || f.act === 'dodge' || f.act === 'squat') enter(f, 'air');
    } else {
      f.y = surf.y;
      return;
    }
  }

  const dy = f.y - prevY;
  // The main stage is solid from every side.
  if (f.x + hw > m.x1 && f.x - hw < m.x2 && f.y < 0 && f.y + c.height > m.bottom) {
    if (prevY >= -0.01 && dy <= 0) return landOn(s, f, 0, 0, prevY, ev);
    if (prevY + c.height <= m.bottom + 0.01) {
      f.y = m.bottom - c.height;
      if (f.vy > 0) f.vy = 0;
      if (f.kbY > 0) f.kbY = -f.kbY * 0.5;
    } else if (f.y > -STEP_UP && f.act !== 'hurt') {
      return landOn(s, f, 0, 0, 0, ev);
    } else {
      f.x = prevX < (m.x1 + m.x2) / 2 ? m.x1 - hw : m.x2 + hw;
      if (f.act === 'hurt') f.kbX = -f.kbX * 0.6;
      f.vx = 0;
    }
  }

  // Platforms: only from above, and not while dropping through.
  if (dy <= 0 && f.dropT <= 0) {
    for (let i = 0; i < st.plats.length; i++) {
      const p = st.plats[i];
      if (prevY >= p.y - 0.01 && f.y <= p.y && f.x >= p.x1 && f.x <= p.x2) return landOn(s, f, i + 1, p.y, prevY, ev);
    }
  }
}

function landOn(s: MatchState, f: FighterState, surface: number, y: number, prevY: number, ev: SimEvent[]) {
  const fall = prevY - f.y;
  // Spiked or launched hard into the floor: bounce.
  if (f.act === 'hurt' && fall > 9 && f.hitstun > 5) {
    f.y = y + 0.01;
    f.kbY = Math.abs(f.kbY) * 0.6;
    f.vy = Math.abs(f.vy) * 0.3;
    return;
  }
  f.y = y;
  f.grounded = true;
  f.surface = surface;
  f.vy = 0;
  f.fastFall = false;
  f.doubleJump = true;
  f.upSpecial = true;
  f.airDodge = true;
  f.jumpAnim = 99;
  f.dropT = 0;
  ev.push({ type: 'land', slot: f.slot, x: f.x, y });
  switch (f.act) {
    case 'air':
      enter(f, 'land');
      f.landLag = LAND_LAG;
      break;
    case 'airdodge':
      enter(f, 'land');
      f.landLag = AIRDODGE_LAND_LAG;
      break;
    case 'hurt':
      f.kbSpeed = 0;
      f.hitstun = 0;
      enter(f, 'land');
      f.landLag = HURT_LAND_LAG;
      break;
    case 'move': {
      const m = moveOf(f);
      if (!m) break;
      if (m.untilLand !== undefined && m.onLand && f.t >= 2) startMove(s, f, m.onLand, 0, 0, ev);
      else if (m.landLag !== undefined) {
        enter(f, 'land');
        f.landLag = m.landLag;
      }
      // Other moves carry on, now on the ground.
      break;
    }
  }
}

function checkBlast(s: MatchState, f: FighterState, ev: SimEvent[]) {
  if (f.act === 'dead' || f.act === 'out' || f.act === 'respawn') return;
  const b = STAGES[s.stage].blast;
  if (f.x >= b.left && f.x <= b.right && f.y >= b.bottom && f.y <= b.top) return;
  ev.push({ type: 'ko', slot: f.slot, x: Math.max(b.left, Math.min(b.right, f.x)), y: Math.max(b.bottom, Math.min(b.top, f.y)) });
  f.stocks--;
  enter(f, f.stocks > 0 ? 'dead' : 'out');
  f.respawnIn = RESPAWN_DELAY;
  f.kbSpeed = 0;
  f.vx = 0;
  f.vy = 0;
  f.hitlag = 0;
  f.weaponOut = false;
  s.projectiles = s.projectiles.filter((p) => !(p.owner === f.slot && p.kind === 'sword'));
}

// ---------------------------------------------------------------- hits

interface Strike {
  dmg: number;
  ang: number;
  bkb: number;
  kbg: number;
  /** Multi-hit: short hitlag. */
  rehit?: number;
}

function touches(shape: Capsule, hurt: Capsule[]) {
  for (const h of hurt) {
    const r = shape[4] + h[4];
    if (segSegDist2(shape[0], shape[1], shape[2], shape[3], h[0], h[1], h[2], h[3]) <= r * r) return true;
  }
  return false;
}

/** Whether this hitbox already hit this fighter. Multi-hit timing counts the attacker's move frames, which pause during hitlag. */
function alreadyHit(a: FighterState, h: HitDef, victim: number) {
  const group = h.group ?? 0;
  for (let i = a.hitLog.length - 3; i >= 0; i -= 3) {
    if (a.hitLog[i] === group && a.hitLog[i + 1] === victim) return !h.rehit || a.t - a.hitLog[i + 2] < h.rehit;
  }
  return false;
}

function resolveHits(s: MatchState, ev: SimEvent[]) {
  const joints = s.fighters.map((f) => jointsOf(f));
  const hurts = s.fighters.map((f, i) => (hittable(f) ? hurtOf(f, joints[i]) : null));
  const pending: { a: FighterState; v: FighterState; h: HitDef; x: number; y: number }[] = [];
  for (const a of s.fighters) {
    const boxes = hitsOf(a, joints[a.slot]);
    if (!boxes.length) continue;
    for (const v of s.fighters) {
      const hurt = hurts[v.slot];
      if (v === a || !hurt) continue;
      for (const { def, shape } of boxes) {
        if (alreadyHit(a, def, v.slot)) continue;
        if (!touches(shape, hurt)) continue;
        pending.push({ a, v, h: def, x: (shape[0] + shape[2]) / 2, y: (shape[1] + shape[3]) / 2 });
        break;
      }
    }
  }
  // All hits on a frame land together, so two fighters can trade.
  for (const { a, v, h, x, y } of pending) {
    a.hitLog.push(h.group ?? 0, v.slot, a.t);
    const dir = h.away ? (v.x >= a.x ? 1 : -1) : a.facing;
    applyHit(s, a, v, h, dir, x, y, ev);
  }
}

function applyHit(s: MatchState, a: FighterState | null, v: FighterState, h: Strike, dir: number, x: number, y: number, ev: SimEvent[]) {
  const vc = CHARS[v.char];
  v.damage = Math.min(999, v.damage + h.dmg);
  const p = v.damage;
  const d = h.dmg;
  const kb = ((p / 10 + (p * d) / 20) * (200 / (vc.stats.weight + 100)) * 1.4 + 18) * (h.kbg / 100) + h.bkb;
  const lag = h.rehit ? 2 : Math.min(18, Math.floor(d * 0.6 + 4));
  v.lastHitBy = a ? a.slot : -1;

  // Armor: the hit does damage but no knockback.
  const vm = moveOf(v);
  if (vm?.armor && v.t >= vm.armor[0] && v.t <= vm.armor[1] && kb < vc.armorKb) {
    v.hitlag = Math.floor(lag / 2);
    if (a) a.hitlag = lag;
    ev.push({ type: 'armor', x, y, victim: v.slot });
    return;
  }

  const kx = dcos(h.ang) * dir;
  let ky = dsin(h.ang);
  enter(v, 'hurt');
  v.hitstun = Math.max(1, Math.floor(kb * HITSTUN));
  v.kbSpeed = kb * LAUNCH;
  v.vx = 0;
  v.vy = 0;
  v.fastFall = false;
  v.charge = 0;
  if (v.grounded) {
    if (kb < 26) ky = 0;
    else {
      // A downward hit on the ground bounces up.
      if (ky < 0) ky = -ky * 0.7;
      leaveGround(v);
    }
  }
  v.kbX = kx;
  v.kbY = ky;
  v.hitlag = lag;
  if (a) {
    a.hitlag = lag;
    const am = moveOf(a);
    if (am?.stopOnHit) {
      a.halted = true;
      a.vx = -a.facing * 1.5;
    }
  }
  // Phantom's orb fades when Phantom is hit.
  s.projectiles = s.projectiles.filter((pr) => !(pr.owner === v.slot && pr.kind === 'orb'));
  ev.push({ type: 'hit', x, y, dmg: d, kb, attacker: a ? a.slot : -1, victim: v.slot });
}

// ---------------------------------------------------------------- projectiles

function spawnProjectile(s: MatchState, f: FighterState, m: MoveDef, def: ProjSpawn, ev: SimEvent[]) {
  const c = CHARS[f.char];
  if (def.kind !== 'shock' && countProjectiles(s, f.slot) >= c.projLimit) return;
  const j = jointsOf(f);
  if (!j) return;
  let speed = def.speed;
  let dmg = def.dmg;
  let kbg = def.kbg;
  let bkb = def.bkb;
  if (m.charge) {
    const k = f.charge / m.charge.max;
    speed *= 1 + 0.6 * k;
    dmg += 8 * k;
    kbg += 22 * k;
    bkb += 8 * k;
  }
  const vx = dcos(def.ang) * speed * f.facing;
  const vy = dsin(def.ang) * speed;
  const p: ProjectileState = {
    id: s.nextId++,
    owner: f.slot,
    kind: def.kind,
    x: j.hip[0] + f.facing * def.x,
    y: def.kind === 'shock' ? f.y : j.hip[1] + def.y,
    vx,
    vy: def.kind === 'shock' ? 0 : vy,
    dir: vx < -0.001 ? -1 : vx > 0.001 ? 1 : f.facing,
    t: 0,
    dmg: Math.round(dmg),
    ang: def.hitAng,
    bkb,
    kbg,
    hit: [],
    back: false,
    surface: f.surface,
  };
  if (def.kind === 'sword') f.weaponOut = true;
  s.projectiles.push(p);
  ev.push({ type: 'shoot', slot: f.slot, kind: def.kind });
}

function updateProjectiles(s: MatchState, ev: SimEvent[]) {
  const st = STAGES[s.stage];
  const m = st.main;
  const keep: ProjectileState[] = [];
  const joints = s.fighters.map((f) => jointsOf(f));
  for (const p of s.projectiles) {
    p.t++;
    const owner = s.fighters[p.owner];
    let gone = false;
    switch (p.kind) {
      case 'arrow':
        p.vy -= 0.06;
        break;
      case 'boulder':
        p.vy -= 0.4;
        break;
      case 'sword': {
        if (!p.back) {
          p.vx -= p.dir * 0.55;
          if (p.vx * p.dir <= 0) {
            p.back = true;
            p.hit = [];
          }
        } else {
          const tx = owner.x;
          const ty = owner.y + 55;
          p.vx = approach(p.vx, tx > p.x ? 15 : -15, 0.8);
          p.vy = (ty - p.y) * 0.12;
          if (Math.abs(tx - p.x) < 40 && Math.abs(ty - p.y) < 60) gone = true;
        }
        if (owner.act === 'dead' || owner.act === 'out') gone = true;
        break;
      }
      case 'shock': {
        const surf = p.surface === 0 ? { x1: m.x1, x2: m.x2, y: 0 } : st.plats[p.surface - 1];
        if (!surf || p.x < surf.x1 || p.x > surf.x2) gone = true;
        break;
      }
    }
    p.x += p.vx;
    p.y += p.vy;
    if (p.t > PROJ_LIFE[p.kind]) gone = true;
    // Arrows, orbs and boulders stop at the stage; the sword flies through it.
    if (p.kind !== 'sword' && p.kind !== 'shock' && p.x > m.x1 && p.x < m.x2 && p.y < 0 && p.y > m.bottom) {
      gone = true;
      if (p.kind === 'boulder') ev.push({ type: 'shatter', x: p.x, y: Math.max(p.y, 0), kind: p.kind });
    }
    const b = st.blast;
    if (p.x < b.left || p.x > b.right || p.y < b.bottom || p.y > b.top) gone = true;

    if (!gone) gone = projectileHits(s, p, joints, ev);
    if (gone) {
      if (p.kind === 'sword') owner.weaponOut = false;
      continue;
    }
    keep.push(p);
  }
  s.projectiles = keep;
}

/** Returns true when the projectile is used up. */
function projectileHits(s: MatchState, p: ProjectileState, joints: ReturnType<typeof jointsOf>[], ev: SimEvent[]): boolean {
  const r = PROJ_R[p.kind];
  for (const v of s.fighters) {
    if (v.slot === p.owner || p.hit.includes(v.slot)) continue;
    const j = joints[v.slot];
    if (!j) continue;
    const rf = REFLECTABLE.includes(p.kind) ? reflectOf(v, j) : null;
    if (rf) {
      const dx = p.x - rf[0];
      const dy = p.y - rf[1];
      if (dx * dx + dy * dy <= (rf[2] + r) * (rf[2] + r)) {
        p.vx = -p.vx * 1.15;
        p.vy = p.kind === 'boulder' ? Math.abs(p.vy) * 0.5 + 4 : -p.vy;
        p.dir = (p.dir === 1 ? -1 : 1) as 1 | -1;
        p.owner = v.slot;
        p.dmg = Math.round(p.dmg * 1.25);
        p.hit = [];
        p.t = 0;
        ev.push({ type: 'reflect', x: p.x, y: p.y, slot: v.slot });
        return false;
      }
    }
    if (!hittable(v)) continue;
    if (!touches([p.x, p.y, p.x, p.y, r], hurtOf(v, j))) continue;
    p.hit.push(v.slot);
    const owner = s.fighters[p.owner];
    applyHit(s, null, v, p, p.dir, p.x, p.y, ev);
    // Credit the thrower (for who knocked whom out); projectiles cause no hitlag for the thrower.
    v.lastHitBy = owner.slot;
    if (p.kind !== 'sword') {
      if (p.kind === 'boulder') ev.push({ type: 'shatter', x: p.x, y: p.y, kind: p.kind });
      return true;
    }
  }
  return false;
}
