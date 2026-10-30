import { CHARS } from './chars';
import { AIR_DODGE, CLIMB_FRAMES, SPOT_DODGE, hitsOf, hittable, hurtOf, jointsOf, ledgeHold, moveOf, pointOf, prioOf, reflectOf, type ActiveHit } from './body';
import { approach, dcos, dsin, dsqrt, segSegDist2 } from './fmath';
import { airHip, type Capsule, type Joints } from './skeleton';
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
/** An aerial that lands before its hit is over keeps going on the ground for up to this many frames, so it still hits. */
const LAND_CARRY = 8;
// Ledges: the two top corners of the main stage.
/** A fresh grab (after landing or being hit) can't be hit for this long. */
const LEDGE_INVINCIBLE = 24;
/** Hanging longer than this lets go. */
const LEDGE_HOLD_MAX = 300;
/** Frames on the ledge before climbing, jumping or letting go. */
const LEDGE_WAIT = 6;
/** After leaving a ledge, frames before a ledge can be grabbed again. */
const REGRAB_FRAMES = 30;
/** During an up special the ledge can be caught with the body's centre this far in under the lip. */
const LEDGE_REACH_UNDER = 10;
/** Rising into the underside this close to an edge slides the fighter out around the lip (per frame, and how close). */
const LIP_SLIDE = 12;
const LIP_ZONE = 48;
const UNTIL_LAND_MAX = 45;
const PROJ_R: Record<ProjKind, number> = { arrow: 7, sword: 12, orb: 13, boulder: 19, shock: 14, toss: 16, bomb: 11, blast: 64, boomerang: 14 };
/** The thrown sword flies point first: it hits along the front of the blade, from just behind its middle to the tip. */
const SWORD_HIT = { back: 9, front: 45 };
const PROJ_LIFE: Record<ProjKind, number> = { arrow: 80, sword: 140, orb: 110, boulder: 240, shock: 30, toss: 150, bomb: 400, blast: 5, boomerang: 150 };
/** Ranger's boomerang: slows this much a frame on the way out, then turns and flies back to her, speeding up to `speed`. */
const BOOMERANG = { decel: 0.5, turn: 0.9, speed: 14, catch: 34 };
/** Ranger's bomb goes off this long after it is thrown (it does not go off on contact). */
export const BOMB_FUSE = 90;
/** A charged arrow grows up to this much bigger (as a share of its size) at full charge. */
const CHARGE_GROW = 1.2;
/** Spartan's sword (thrown or tossed up) is never used up by a hit or a clash. */
const KEEPS: ProjKind[] = ['sword', 'toss'];
// Priority clashes.
/** Both fighters freeze this long when one attack beats another. */
const CLASH_LAG = 6;
/** A move beaten by a higher-priority attack: the fighter is stunned this long and pushed back. */
const RECOIL = 16;
/** Gliding ends by itself after this long. */
const GLIDE_MAX = 240;
const REFLECTABLE: ProjKind[] = ['arrow', 'orb', 'boulder'];
/** Neither swatted by attacks nor clashing with other projectiles. */
const UNTOUCHABLE: ProjKind[] = ['bomb', 'blast'];

const DIRS = BTN.left | BTN.right | BTN.up | BTN.down;
const ACTIONS = BTN.attack | BTN.special | BTN.jump | BTN.dodge;

// ---------------------------------------------------------------- setup

export interface MatchConfig {
  stage: StageId;
  chars: CharId[];
  seed: number;
  /** Stocks each (default 3). */
  stocks?: number;
  /** Time limit in frames; null for none (default 3 minutes). */
  time?: number | null;
}

export function createMatch(cfg: MatchConfig): MatchState {
  const st = STAGES[cfg.stage];
  const fighters = cfg.chars.map((char, slot) => {
    // A second copy of the same character gets the alternate colours.
    const palette = cfg.chars.slice(0, slot).filter((c) => c === char).length;
    const [x, y] = st.spawns[slot];
    const f = newFighter(slot, char, palette, x, y);
    f.stocks = cfg.stocks ?? STOCKS;
    return f;
  });
  return {
    frame: 0,
    rng: cfg.seed | 0,
    stage: cfg.stage,
    phase: 'countdown',
    phaseT: 0,
    clock: cfg.time ?? MATCH_FRAMES,
    timed: cfg.time !== null,
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
    airJumps: CHARS[char].stats.airJumps ?? 1,
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
    ledgeSide: 0,
    regrab: 0,
    ledgeFresh: true,
    ledgeLock: 0,
    landAt: -1,
    armorUsed: false,
    aim: 0,
    heldBy: -1,
    holding: -1,
    tLen: 0,
    tAng: 0,
    tSlot: -1,
    tLedge: 0,
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

  if (s.timed) {
    s.clock--;
    if (s.clock > 0 && s.clock <= 600 && s.clock % 60 === 0) ev.push({ type: 'tick', seconds: s.clock / 60 });
  }

  const alive = s.fighters.filter((f) => f.act !== 'out');
  if (s.fighters.length >= 2 && alive.length <= 1) {
    if (alive.length === 1) finish(s, alive[0].slot, 'stocks', ev);
    // Everyone left lost their last stock on the same frame.
    else if (s.suddenDeath) finish(s, -1, 'stocks', ev);
    else beginSuddenDeath(s, aliveBefore, ev);
  } else if (s.timed && s.clock <= 0) {
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
  s.timed = true;
  s.phase = 'countdown';
  s.phaseT = 0;
}

// ---------------------------------------------------------------- fighters

function enter(f: FighterState, act: Act) {
  f.act = act;
  f.t = 0;
  f.landAt = -1;
  // A held opponent is let go by anything but the throw itself (which sets it again).
  f.holding = -1;
  if (act !== 'move') {
    f.move = null;
    f.tLen = 0;
    f.tSlot = -1;
    f.tLedge = 0;
  }
}

function updateFighter(s: MatchState, f: FighterState, input: number, ev: SimEvent[], frozen: boolean) {
  const c = CHARS[f.char];
  const press = input & ~f.prev;
  if (!frozen) f.prev = input;
  if (press & ACTIONS) {
    f.buf = press & ACTIONS;
    f.bufT = BUFFER;
    f.bufDir = input & DIRS;
    // The buffer waits out a hit's freeze, so a press made during it still comes out (a quick second punch).
  } else if (f.bufT > 0 && f.hitlag === 0 && --f.bufT === 0) f.buf = 0;

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
  if (f.regrab > 0) f.regrab--;
  if (f.jumpAnim < 99) f.jumpAnim++;
  f.t++;

  // Held by a grab: the holder moves this fighter until the throw.
  if (f.act === 'held') {
    const h = s.fighters[f.heldBy];
    if (h && h.holding === f.slot && h.act === 'move') return;
    f.heldBy = -1;
    enter(f, 'air');
  }

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
    case 'glide':
      // Any attack, jump or dodge ends the glide and comes out at once (below).
      if ((f.buf & ACTIONS && !frozen) || f.t >= GLIDE_MAX) enter(f, 'air');
      break;
    case 'move':
      advanceMove(s, f, input, ev);
      break;
    case 'ledge':
      onLedge(f, input, ev, frozen);
      if (f.act === 'ledge' || f.act === 'climb') return;
      break;
    case 'climb':
      climbing(s, f);
      return;
  }

  if (f.act === 'idle' || f.act === 'run' || f.act === 'air') {
    if (!frozen) tryActions(s, f, input, ev);
  }

  // ---- movement
  const st = c.stats;
  const m = moveOf(f);
  // Pulled along a tether: the speed was set by the move.
  const pulled = !!m?.pull && !f.halted && f.t <= m.pull.until;
  if (pulled) {
    // Nothing: the pull sets the speed each frame.
  } else if (m?.still && f.t >= m.still[0] && f.t <= m.still[1]) {
    // Held in place: no speed, gravity or drift, and what was left of a launch is gone too.
    f.vx = 0;
    f.vy = 0;
    f.kbSpeed = 0;
  } else if (f.grounded) {
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
  } else if (f.act === 'glide') {
    // Gliding: up holds altitude but slows down, down dives steeply, back slows.
    const up = input & BTN.up && !frozen;
    const down = input & BTN.down && !frozen;
    const back = dirX === -f.facing && !frozen;
    const speed = down ? 5.5 : up ? 4.2 : back ? 3.4 : 5.8;
    const sink = down ? -7 : up ? -0.3 : -1.2;
    f.vx = approach(f.vx, f.facing * speed, 0.3);
    f.vy = approach(f.vy, sink, 0.35);
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
  collide(s, f, prevY, ev);
  if (!f.grounded && !frozen) tryGrabLedge(s, f, input, ev);
}

// ---------------------------------------------------------------- ledges

function tryGrabLedge(s: MatchState, f: FighterState, input: number, ev: SimEvent[]) {
  if (f.regrab > 0 || input & BTN.down) return;
  const m = moveOf(f);
  // While falling (or during an up special, which can reach for the ledge on the way up). Not while launched.
  const reaching = f.act === 'move' && f.move === 'uspec';
  if (!(f.act === 'air' || f.act === 'airdodge' || f.act === 'move' || f.act === 'glide') || (m?.hidden && f.t >= m.hidden[0] && f.t <= m.hidden[1])) return;
  if (!reaching && f.vy + f.kbSpeed * f.kbY > 0) return;
  const c = CHARS[f.char];
  const main = STAGES[s.stage].main;
  const hold = ledgeHold(f.char);
  // The ledge has to be within reach of the hands: between chest height and a little above the head.
  if (f.y > -c.height * 0.5 || f.y < -hold.y - 22) return;
  for (const side of [-1, 1]) {
    const ledgeX = side > 0 ? main.x2 : main.x1;
    const out = side * (f.x - ledgeX);
    // An up special reaches a little under the lip, so a recovery that comes up just inside the edge still catches it.
    if (out < (reaching ? -(c.halfWidth + LEDGE_REACH_UNDER) : -4) || out > c.halfWidth + 30) continue;
    if (grabLedge(s, f, side, input, ev)) return;
  }
}

function ledgeTaken(s: MatchState, f: FighterState, side: number) {
  return s.fighters.some((o) => o !== f && (o.act === 'ledge' || o.act === 'climb') && o.ledgeSide === side);
}

/** Hangs from the ledge on this side (-1 left, 1 right), unless someone else holds it. */
function grabLedge(s: MatchState, f: FighterState, side: number, input: number, ev: SimEvent[]): boolean {
  if (ledgeTaken(s, f, side)) return false;
  const main = STAGES[s.stage].main;
  const ledgeX = side > 0 ? main.x2 : main.x1;
  const hold = ledgeHold(f.char);
  enter(f, 'ledge');
  f.ledgeSide = side;
  f.facing = (side > 0 ? -1 : 1) as 1 | -1;
  f.x = ledgeX + side * hold.x;
  f.y = -hold.y;
  f.vx = 0;
  f.vy = 0;
  f.kbSpeed = 0;
  f.fastFall = false;
  f.buf = 0;
  f.bufT = 0;
  // A direction held while recovering does not climb or let go by itself: it has to be pressed again.
  f.ledgeLock = input & DIRS;
  // Grabbing a ledge gives back the air jumps, the up special and the air dodge.
  f.airJumps = CHARS[f.char].stats.airJumps ?? 1;
  f.upSpecial = true;
  f.airDodge = true;
  if (f.ledgeFresh) {
    f.invincible = Math.max(f.invincible, LEDGE_INVINCIBLE);
    f.ledgeFresh = false;
  }
  ev.push({ type: 'ledge', slot: f.slot });
  return true;
}

/** Hanging: toward the stage or up climbs, jump jumps, away or down lets go. */
function onLedge(f: FighterState, input: number, ev: SimEvent[], frozen: boolean) {
  const side = f.ledgeSide;
  const toward = side > 0 ? BTN.left : BTN.right;
  const away = side > 0 ? BTN.right : BTN.left;
  f.ledgeLock &= input;
  const dirs = input & DIRS & ~f.ledgeLock;
  if (f.t >= LEDGE_HOLD_MAX) return letGo(f);
  if (frozen || f.t < LEDGE_WAIT) return;
  if (f.buf & BTN.jump) {
    const c = CHARS[f.char];
    f.buf = 0;
    enter(f, 'air');
    f.vy = c.stats.jump;
    f.vx = -side * 2;
    f.regrab = REGRAB_FRAMES;
    f.ledgeSide = 0;
    ev.push({ type: 'jump', slot: f.slot, double: false });
  } else if (dirs & (toward | BTN.up) || f.buf & BTN.dodge) {
    f.buf = 0;
    enter(f, 'climb');
  } else if (dirs & (away | BTN.down)) {
    letGo(f);
  }
}

function letGo(f: FighterState) {
  enter(f, 'air');
  f.x += f.ledgeSide * 4;
  f.vy = 0;
  f.regrab = REGRAB_FRAMES;
  f.ledgeSide = 0;
}

/** Climbing up: rise to the top first, then step onto the stage. */
function climbing(s: MatchState, f: FighterState) {
  const c = CHARS[f.char];
  const main = STAGES[s.stage].main;
  const side = f.ledgeSide;
  const ledgeX = side > 0 ? main.x2 : main.x1;
  const hold = ledgeHold(f.char);
  const fromX = ledgeX + side * hold.x;
  const toX = ledgeX - side * (c.halfWidth + 6);
  const up = Math.min(1, f.t / 12);
  const over = Math.max(0, Math.min(1, (f.t - 8) / 14));
  f.y = -hold.y * (1 - up);
  f.x = fromX + (toX - fromX) * over;
  if (f.t >= CLIMB_FRAMES) {
    f.x = toX;
    f.y = 0;
    f.grounded = true;
    f.surface = 0;
    f.ledgeSide = 0;
    f.airJumps = CHARS[f.char].stats.airJumps ?? 1;
    f.upSpecial = true;
    f.airDodge = true;
    f.ledgeFresh = true;
    enter(f, 'idle');
  }
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
  if (b & BTN.jump && !f.grounded && f.airJumps > 0) {
    f.buf &= ~BTN.jump;
    f.airJumps--;
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
  // One bomb at a time (its blast included), and one boomerang.
  if (m.proj?.some((p) => p.kind === 'bomb') && s.projectiles.some((q) => q.owner === f.slot && (q.kind === 'bomb' || q.kind === 'blast'))) return false;
  if (m.proj?.some((p) => p.kind === 'boomerang') && s.projectiles.some((q) => q.owner === f.slot && q.kind === 'boomerang')) return false;
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
  f.armorUsed = false;
  f.aim = 0;
  if (m.hits?.some((h) => !h.grab)) ev.push({ type: 'swing', slot: f.slot, heavy: m.hits.some((h) => h.dmg >= 12) });
  moveEffects(s, f, m, input, ev);
}

function advanceMove(s: MatchState, f: FighterState, input: number, ev: SimEvent[]) {
  const m = moveOf(f);
  if (!m) return enter(f, f.grounded ? 'idle' : 'air');
  // An aimed shot follows up or down held until it leaves.
  if (m.aim && f.t <= (m.proj?.[0]?.f ?? 0)) f.aim = input & BTN.up ? m.aim : input & BTN.down ? -m.aim : 0;
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
  // An aerial carrying on after landing: its hit is over, so now the landing lag.
  if (f.landAt >= 0) {
    if (!f.grounded) f.landAt = -1;
    else if (f.t > f.landAt) {
      enter(f, 'land');
      f.landLag = m.landLag ?? LAND_LAG;
      return;
    }
  }
  if (f.t >= m.total) return enter(f, f.grounded ? 'idle' : m.glide ? 'glide' : 'air');
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
  if (m.throw && f.holding >= 0) {
    if (t < m.throw.release) holdVictim(s, f, m);
    else if (t === m.throw.release) throwVictim(s, f, m, ev);
  }
  if (m.tether) tether(s, f, m, input, ev);
  if (m.pull && !f.halted && t <= m.pull.until) pull(s, f, m, input, ev);
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

// ---------------------------------------------------------------- grabs, tethers

/** Keeps a grabbed opponent at the holding point (their chest at the hand). */
function holdVictim(s: MatchState, f: FighterState, m: MoveDef) {
  const v = s.fighters[f.holding];
  const j = jointsOf(f);
  if (!v || !j || !m.throw) return;
  const p = pointOf(f, j, m.throw.hold);
  const vb = CHARS[v.char].body;
  v.x = p[0];
  v.y = p[1] - airHip(vb) - vb.torso * 0.5;
}

function throwVictim(s: MatchState, f: FighterState, m: MoveDef, ev: SimEvent[]) {
  const v = s.fighters[f.holding];
  const th = m.throw!;
  f.holding = -1;
  if (!v || v.act !== 'held') return;
  v.heldBy = -1;
  holdVictim(s, f, m);
  applyHit(s, f, v, th, th.backward ? -f.facing : f.facing, v.x, v.y + CHARS[v.char].height * 0.5, ev);
}

/** A command grab caught `v`: start the throw with `v` held. */
function grab(s: MatchState, a: FighterState, v: FighterState, h: HitDef, ev: SimEvent[]) {
  if (v.act === 'held' || a.act !== 'move' || !h.grab) return;
  a.hitLog.push(h.group ?? 0, v.slot, a.t);
  startMove(s, a, h.grab, 0, 0, ev);
  a.holding = v.slot;
  enter(v, 'held');
  v.heldBy = a.slot;
  v.vx = 0;
  v.vy = 0;
  v.kbSpeed = 0;
  v.hitstun = 0;
  v.hitlag = 0;
  v.fastFall = false;
  v.charge = 0;
  v.ledgeSide = 0;
  leaveGround(v);
  v.facing = a.facing === 1 ? -1 : 1;
  holdVictim(s, a, CHARS[a.char].moves[h.grab]);
  ev.push({ type: 'grab', slot: a.slot });
}

/** Where the tether starts (the shoulder) and its tip. */
export function tetherLine(f: FighterState, j: Joints): [number, number, number, number] {
  return [j.neck[0], j.neck[1], j.neck[0] + f.facing * dcos(f.tAng) * f.tLen, j.neck[1] + dsin(f.tAng) * f.tLen];
}

/** The tether goes out, and catches the first opponent or ledge its tip touches. */
function tether(s: MatchState, f: FighterState, m: MoveDef, input: number, ev: SimEvent[]) {
  const tt = m.tether!;
  const t = f.t;
  if (t === tt.f[0]) {
    f.tAng = f.grounded ? 0 : tt.airAng;
    f.tSlot = -1;
    f.tLedge = 0;
  }
  if (t < tt.f[0]) return;
  if (t > tt.f[1]) {
    f.tLen = Math.max(0, f.tLen - tt.speed * 1.5);
    return;
  }
  f.tLen = Math.min(tt.len, (t - tt.f[0] + 1) * tt.speed);
  const j = jointsOf(f);
  if (!j) return;
  const [, , x, y] = tetherLine(f, j);
  for (const v of s.fighters) {
    if (v === f || !hittable(v)) continue;
    if (!touches([x, y, x, y, 10], hurtOf(v))) continue;
    f.tSlot = v.slot;
    startMove(s, f, tt.zip, input, 0, ev);
    leaveGround(f);
    return;
  }
  if (f.grounded) return;
  const main = STAGES[s.stage].main;
  for (const side of [-1, 1]) {
    const cx = side > 0 ? main.x2 : main.x1;
    if ((x - cx) * (x - cx) + y * y > 32 * 32 || ledgeTaken(s, f, side) || f.regrab > 0) continue;
    f.tLedge = side;
    startMove(s, f, tt.reel, input, 0, ev);
    return;
  }
}

/** Flies along the tether: to the caught opponent (a zip) or to the caught ledge (a reel, ending on the ledge). */
function pull(s: MatchState, f: FighterState, m: MoveDef, input: number, ev: SimEvent[]) {
  const pl = m.pull!;
  const c = CHARS[f.char];
  let tx: number;
  let ty: number;
  if (pl.kind === 'zip') {
    const v = s.fighters[f.tSlot];
    if (!v || v.act === 'dead' || v.act === 'out') {
      f.halted = true;
      return;
    }
    tx = v.x;
    ty = v.y + CHARS[v.char].height * 0.5 - c.height * 0.5;
    f.facing = tx >= f.x ? 1 : -1;
  } else {
    const main = STAGES[s.stage].main;
    const hold = ledgeHold(f.char);
    tx = (f.tLedge > 0 ? main.x2 : main.x1) + f.tLedge * hold.x;
    ty = -hold.y;
  }
  const dx = tx - f.x;
  const dy = ty - f.y;
  const d = dsqrt(dx * dx + dy * dy);
  if (pl.kind === 'reel' && d <= pl.speed + 2) {
    f.x = tx;
    f.y = ty;
    if (!grabLedge(s, f, f.tLedge, input, ev)) f.halted = true;
    return;
  }
  if (d < 1) return;
  f.vx = (dx / d) * pl.speed;
  f.vy = (dy / d) * pl.speed;
  if (f.grounded && f.vy > 0) leaveGround(f);
  // The opponent's line is kept for drawing.
  if (pl.kind === 'zip') f.tLen = d;
}

// ---------------------------------------------------------------- stage collision

function collide(s: MatchState, f: FighterState, prevY: number, ev: SimEvent[]) {
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
  // The main stage is solid from every side. Landing and bumping into its
  // underside go by the fighter's centre; the sides push the body out by how
  // far its feet are below the top (like a diamond-shaped body), so a fighter
  // stepping off the edge slides off smoothly instead of landing again.
  if (f.y < 0 && f.y + c.height > m.bottom) {
    const over = f.x >= m.x1 && f.x <= m.x2;
    if (over && prevY >= -0.01 && dy <= 0) return landOn(s, f, 0, 0, prevY, ev);
    if (over && prevY + c.height <= m.bottom + 0.01) {
      f.y = m.bottom - c.height;
      // Rising into the underside close to an edge (not launched): slide out around the lip and keep rising,
      // instead of being stopped dead under the stage.
      const toLeft = f.x - m.x1;
      const toRight = m.x2 - f.x;
      if (f.act !== 'hurt' && f.vy > 0 && Math.min(toLeft, toRight) < hw + LIP_ZONE) {
        // Out until the whole body clears the edge (then the side of the stage keeps it out).
        f.x += toLeft < toRight ? -Math.min(LIP_SLIDE, toLeft + hw + 1) : Math.min(LIP_SLIDE, toRight + hw + 1);
      } else {
        if (f.vy > 0) f.vy = 0;
        if (f.kbY > 0) f.kbY = -f.kbY * 0.5;
      }
    } else {
      const reach = Math.min(hw, -f.y);
      if (f.x + reach > m.x1 && f.x - reach < m.x2) {
        f.x = f.x < (m.x1 + m.x2) / 2 ? m.x1 - reach : m.x2 + reach;
        if (f.act === 'hurt') f.kbX = -f.kbX * 0.6;
        f.vx = 0;
      }
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
  f.airJumps = CHARS[f.char].stats.airJumps ?? 1;
  f.upSpecial = true;
  f.airDodge = true;
  f.jumpAnim = 99;
  f.dropT = 0;
  f.ledgeFresh = true;
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
    case 'glide':
      enter(f, 'land');
      f.landLag = LAND_LAG;
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
        // Landing before the hit is over: the attack keeps going on the ground for a few frames.
        const last = lastHitFrame(m);
        if (f.landAt < 0 && f.t <= last) f.landAt = Math.min(last, f.t + LAND_CARRY);
        else if (f.landAt < 0) {
          enter(f, 'land');
          f.landLag = m.landLag;
        }
      }
      // Other moves carry on, now on the ground.
      break;
    }
  }
}

/** The last frame on which a move can hit or shoot (-1 if it never does). */
function lastHitFrame(m: MoveDef): number {
  let last = -1;
  for (const h of m.hits ?? []) last = Math.max(last, h.f[1]);
  for (const p of m.proj ?? []) last = Math.max(last, p.f);
  return last;
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
  hitstun?: number;
}

function touches(shape: Capsule, hurt: Capsule[]) {
  for (const h of hurt) if (capsTouch(shape, h)) return true;
  return false;
}

function capsTouch(a: Capsule, b: Capsule) {
  const r = a[4] + b[4];
  return segSegDist2(a[0], a[1], a[2], a[3], b[0], b[1], b[2], b[3]) <= r * r;
}

/** The highest priority among `a`'s hitboxes that touch `b`'s, and the same for `b` (0: no touch). Grabs never clash. */
function clash(a: FighterState, ba: ActiveHit[], b: FighterState, bb: ActiveHit[]) {
  const ma = moveOf(a);
  const mb = moveOf(b);
  if (!ma || !mb) return null;
  let pa = 0;
  let pb = 0;
  let x = 0;
  let y = 0;
  for (const p of ba) {
    if (p.def.grab || alreadyHit(a, p.def, b.slot)) continue;
    for (const q of bb) {
      if (q.def.grab || alreadyHit(b, q.def, a.slot) || !capsTouch(p.shape, q.shape)) continue;
      pa = Math.max(pa, prioOf(ma, p.def));
      pb = Math.max(pb, prioOf(mb, q.def));
      x = (p.shape[2] + q.shape[2]) / 2;
      y = (p.shape[3] + q.shape[3]) / 2;
    }
  }
  return pa ? { pa, pb, x, y } : null;
}

/** A move beaten by a higher-priority attack stops; the fighter is pushed back and stunned for a moment. */
function recoil(f: FighterState, fromX: number) {
  enter(f, 'hurt');
  f.hitstun = RECOIL;
  f.kbSpeed = 3.5;
  f.kbX = f.x >= fromX ? 1 : -1;
  f.kbY = 0;
  f.vx = 0;
  if (f.vy > 0) f.vy = 0;
  f.charge = 0;
  f.hitlag = CLASH_LAG;
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
  const all = s.fighters.map((f, i) => hitsOf(f, joints[i]));
  // Attacks touching each other: the higher priority beats the lower; even ones trade (both carry on).
  for (let i = 0; i < s.fighters.length; i++) {
    for (let k = i + 1; k < s.fighters.length; k++) {
      const c = clash(s.fighters[i], all[i], s.fighters[k], all[k]);
      if (!c || c.pa === c.pb) continue;
      const win = c.pa > c.pb ? i : k;
      const lose = win === i ? k : i;
      recoil(s.fighters[lose], s.fighters[win].x);
      s.fighters[win].hitlag = Math.max(s.fighters[win].hitlag, CLASH_LAG);
      all[lose] = [];
      ev.push({ type: 'clash', x: c.x, y: c.y });
    }
  }
  const hurts = s.fighters.map((f, i) => (hittable(f) ? hurtOf(f, joints[i]) : null));
  const pending: { a: FighterState; v: FighterState; h: HitDef; x: number; y: number }[] = [];
  for (const a of s.fighters) {
    const boxes = all[a.slot];
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
    if (h.grab) {
      grab(s, a, v, h, ev);
      continue;
    }
    a.hitLog.push(h.group ?? 0, v.slot, a.t);
    const dir = h.away ? (v.x >= a.x ? 1 : -1) : h.pull ? (v.x >= a.x ? -1 : 1) : a.facing;
    applyHit(s, a, v, v.grounded && h.onGround ? { ...h, ...h.onGround } : h, dir, x, y, ev);
  }
}

function applyHit(s: MatchState, a: FighterState | null, v: FighterState, h: Strike, dir: number, x: number, y: number, ev: SimEvent[]) {
  const vc = CHARS[v.char];
  v.damage = Math.min(999, v.damage + h.dmg);
  const p = v.damage;
  const d = h.dmg;
  const kb = (((p / 10 + (p * d) / 20) * (200 / (vc.stats.weight + 100)) * 1.4 + 18) * (h.kbg / 100) + h.bkb) * (v.grounded ? (vc.groundKb ?? 1) : 1);
  // Hitstun comes from the same formula without the weight: heavy fighters fly less far but are stunned as long.
  const stunKb = ((p / 10 + (p * d) / 20) * 1.4 + 18) * (h.kbg / 100) + h.bkb;
  const lag = h.rehit ? 2 : Math.min(18, Math.floor(d * 0.6 + 4));
  v.lastHitBy = a ? a.slot : -1;

  // Armor: the hit does damage but no knockback. Super armor takes any number of hits of any strength.
  const vm = moveOf(v);
  if (vm?.superArmor && v.t >= vm.superArmor[0] && v.t <= vm.superArmor[1]) {
    v.hitlag = Math.floor(lag / 2);
    if (a) a.hitlag = lag;
    ev.push({ type: 'armor', x, y, victim: v.slot });
    return;
  }
  if (vm?.armor && v.t >= vm.armor[0] && v.t <= vm.armor[1] && kb < vc.armorKb && !v.armorUsed) {
    // Armor holds against one hit per move; the next hit goes through.
    v.armorUsed = true;
    v.hitlag = Math.floor(lag / 2);
    if (a) a.hitlag = lag;
    ev.push({ type: 'armor', x, y, victim: v.slot });
    return;
  }

  const kx = dcos(h.ang) * dir;
  let ky = dsin(h.ang);
  enter(v, 'hurt');
  v.ledgeSide = 0;
  v.ledgeFresh = true;
  v.hitstun = Math.max(1, Math.floor(stunKb * HITSTUN * (h.hitstun ?? 1)));
  // Being hit gives back the up special, so a fighter knocked offstage can always try to recover.
  v.upSpecial = true;
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
    if (am?.bounce) {
      // Springs back off the opponent.
      a.halted = true;
      a.vx = -a.facing * am.bounce.vx;
      a.vy = am.bounce.vy;
      a.fastFall = false;
      leaveGround(a);
    } else if (am?.stopOnHit) {
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
  // A shot aimed up or down leaves from the hand along the aim.
  const aim = m.aim ? f.aim : 0;
  const ang = def.ang + aim;
  let size = 1;
  if (m.charge) {
    const k = f.charge / m.charge.max;
    speed *= 1 + 0.6 * k;
    dmg += 8 * k;
    kbg += 22 * k;
    bkb += 8 * k;
    size += CHARGE_GROW * k;
  }
  const vx = dcos(ang) * speed * f.facing;
  const vy = dsin(ang) * speed;
  const p: ProjectileState = {
    id: s.nextId++,
    owner: f.slot,
    kind: def.kind,
    x: aim ? j[def.from ?? 'hand1'][0] : j.hip[0] + f.facing * def.x,
    // Shockwaves run along the floor; a boulder thrown on the ground starts resting on it.
    y: aim ? j[def.from ?? 'hand1'][1] : def.kind === 'shock' ? f.y : def.kind === 'boulder' && f.grounded ? f.y + PROJ_R.boulder : j.hip[1] + def.y,
    vx,
    vy: def.kind === 'shock' ? 0 : vy,
    dir: vx < -0.001 ? -1 : vx > 0.001 ? 1 : f.facing,
    ux: dcos(ang) * f.facing,
    uy: dsin(ang),
    t: 0,
    dmg: Math.round(dmg),
    ang: def.hitAng + aim * 0.5,
    bkb,
    kbg,
    hitstun: def.hitstun ?? 1,
    hit: [],
    back: false,
    surface: f.surface,
    prio: def.prio ?? m.prio ?? (dmg <= 6 ? 1 : dmg <= 11 ? 2 : 3),
    nearBkb: def.near?.bkb ?? 0,
    nearKbg: def.near?.kbg ?? 0,
    nearT: def.near?.frames ?? 0,
    clashed: [],
    size,
  };
  if (KEEPS.includes(def.kind)) f.weaponOut = true;
  s.projectiles.push(p);
  ev.push({ type: 'shoot', slot: f.slot, kind: def.kind });
}

function updateProjectiles(s: MatchState, ev: SimEvent[]) {
  const st = STAGES[s.stage];
  const m = st.main;
  const keep: ProjectileState[] = [];
  const joints = s.fighters.map((f) => jointsOf(f));
  const boxes = s.fighters.map((f, i) => hitsOf(f, joints[i]));
  for (const p of s.projectiles) {
    p.t++;
    const owner = s.fighters[p.owner];
    let gone = false;
    switch (p.kind) {
      case 'arrow':
        p.vy -= 0.06;
        break;
      case 'boulder':
        p.vy -= 0.5;
        break;
      case 'sword': {
        // A stab throw: straight out along its aim, point first, slowing down; then straight back along the same line.
        if (!p.back) {
          p.vx -= p.ux * 0.55;
          p.vy -= p.uy * 0.55;
          if (p.vx * p.ux + p.vy * p.uy <= 0) {
            p.back = true;
            p.hit = [];
          }
        } else {
          p.vx = approach(p.vx, -p.ux * 15, 0.8 * Math.abs(p.ux));
          p.vy = approach(p.vy, -p.uy * 15, 0.8 * Math.abs(p.uy));
          // Caught when it reaches Spartan's hand. If he has moved off the line, it flies on until it is gone.
          if (Math.abs(owner.x - p.x) < 40 && Math.abs(owner.y + 55 - p.y) < 60) gone = true;
        }
        if (owner.act === 'dead' || owner.act === 'out') gone = true;
        break;
      }
      case 'shock': {
        const surf = p.surface === 0 ? { x1: m.x1, x2: m.x2, y: 0 } : st.plats[p.surface - 1];
        if (!surf || p.x < surf.x1 || p.x > surf.x2) gone = true;
        break;
      }
      case 'boomerang': {
        // Out along its aim, slowing; then it turns and flies back to Ranger wherever she is, and is caught
        // when it reaches her. It can hit each fighter once on the way out and once on the way back.
        if (!p.back) {
          p.vx -= p.ux * BOOMERANG.decel;
          p.vy -= p.uy * BOOMERANG.decel;
          if (p.vx * p.ux + p.vy * p.uy <= 0) {
            p.back = true;
            p.hit = [];
          }
        } else {
          const dx = owner.x - p.x;
          const dy = owner.y + CHARS[owner.char].height * 0.55 - p.y;
          const d = dsqrt(dx * dx + dy * dy) || 1;
          if (d < BOOMERANG.catch) gone = true;
          p.vx = approach(p.vx, (dx / d) * BOOMERANG.speed, BOOMERANG.turn);
          p.vy = approach(p.vy, (dy / d) * BOOMERANG.speed, BOOMERANG.turn);
          if (p.vx !== 0) p.dir = p.vx < 0 ? -1 : 1;
        }
        if (owner.act === 'dead' || owner.act === 'out') gone = true;
        break;
      }
      case 'bomb':
        // Lobbed: it falls, comes to rest on whatever it lands on, and goes off when the fuse runs out.
        if (p.vy === 0) p.vx *= 0.8;
        p.vy -= 0.42;
        if (p.t >= BOMB_FUSE) {
          explode(p, keep, ev);
          gone = true;
        }
        break;
      case 'toss': {
        // Spartan's sword tossed up: it slows, then falls, easing over to stay above him. Caught in
        // the hand during his up special; otherwise back in hand once it falls back to him.
        p.vy -= 0.42;
        p.vx = (owner.x - p.x) * 0.15;
        const j = joints[p.owner];
        if (j && p.t > 8) {
          const reach = owner.act === 'move' && owner.move === 'uspec' ? 42 : p.vy < 0 && p.t > 40 ? 55 : 0;
          const dx = j.hand1[0] - p.x;
          const dy = j.hand1[1] - p.y;
          if (reach && dx * dx + dy * dy <= reach * reach) gone = true;
        }
        if (owner.act === 'dead' || owner.act === 'out') gone = true;
        break;
      }
    }
    const prevY = p.y;
    p.x += p.vx;
    p.y += p.vy;
    if (p.kind === 'boulder' || p.kind === 'bomb') rollOnFloor(st, p, prevY);
    if (p.t > PROJ_LIFE[p.kind]) {
      gone = true;
      if (p.kind === 'boulder') ev.push({ type: 'shatter', x: p.x, y: p.y, kind: p.kind });
    }
    // Arrows, orbs and boulders stop at the stage, and a bomb thrown into its side goes off; the sword flies through it.
    if (!gone && !KEEPS.includes(p.kind) && p.kind !== 'shock' && p.kind !== 'blast' && p.kind !== 'boomerang' && p.x > m.x1 && p.x < m.x2 && p.y < 0 && p.y > m.bottom) {
      gone = true;
      if (p.kind === 'boulder') ev.push({ type: 'shatter', x: p.x, y: Math.max(p.y, 0), kind: p.kind });
      if (p.kind === 'bomb') explode(p, keep, ev);
    }
    const b = st.blast;
    if (p.x < b.left || p.x > b.right || p.y < b.bottom || p.y > b.top) gone = true;

    if (!gone) gone = projectileClash(s, p, boxes, ev);
    if (!gone) gone = projectileHits(s, p, joints, ev);
    if (gone) {
      if (KEEPS.includes(p.kind)) owner.weaponOut = false;
      continue;
    }
    keep.push(p);
  }
  // Projectiles touching each other: the higher priority destroys the lower; even ones destroy each other.
  const out = keep.map(() => false);
  for (let i = 0; i < keep.length; i++) {
    for (let k = i + 1; k < keep.length; k++) {
      const p = keep[i];
      const q = keep[k];
      if (p.owner === q.owner || out[i] || out[k] || p.clashed.includes(q.id)) continue;
      if (UNTOUCHABLE.includes(p.kind) || UNTOUCHABLE.includes(q.kind)) continue;
      if (!capsTouch(projShape(p), projShape(q))) continue;
      p.clashed.push(q.id);
      q.clashed.push(p.id);
      ev.push({ type: 'clash', x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      if (q.prio >= p.prio) out[i] = beaten(p);
      if (p.prio >= q.prio) out[k] = beaten(q);
    }
  }
  s.projectiles = keep.filter((p, i) => {
    if (out[i] && KEEPS.includes(p.kind)) s.fighters[p.owner].weaponOut = false;
    return !out[i];
  });
}

/** The area a projectile covers: the thrown sword hits along its blade, the rest are circles. */
export function projShape(p: ProjectileState): Capsule {
  const r = PROJ_R[p.kind] * p.size;
  return p.kind === 'sword'
    ? [p.x - p.ux * SWORD_HIT.back, p.y - p.uy * SWORD_HIT.back, p.x + p.ux * SWORD_HIT.front, p.y + p.uy * SWORD_HIT.front, r]
    : [p.x, p.y, p.x, p.y, r];
}

/** A projectile that lost a clash. True when it is gone; Spartan's sword is never destroyed (thrown, it flies back; tossed, it falls). */
function beaten(p: ProjectileState): boolean {
  if (p.kind === 'sword') {
    p.back = true;
    return false;
  }
  if (p.kind === 'toss') {
    if (p.vy > 0) p.vy = 0;
    return false;
  }
  return true;
}

/**
 * A projectile touching an opponent's attack. The higher priority wins: a
 * stronger or even attack swats the projectile away (the attack carries on);
 * a weaker attack is stopped and the projectile flies on. Returns true when
 * the projectile is gone.
 */
function projectileClash(s: MatchState, p: ProjectileState, boxes: ActiveHit[][], ev: SimEvent[]): boolean {
  if (UNTOUCHABLE.includes(p.kind)) return false;
  const shape = projShape(p);
  for (const v of s.fighters) {
    if (v.slot === p.owner || p.hit.includes(v.slot) || !boxes[v.slot].length) continue;
    const m = moveOf(v);
    if (!m) continue;
    // A reflect deals with arrows, orbs and boulders itself.
    if (REFLECTABLE.includes(p.kind) && reflectOf(v)) continue;
    let pm = 0;
    for (const b of boxes[v.slot]) if (!b.def.grab && capsTouch(b.shape, shape)) pm = Math.max(pm, prioOf(m, b.def));
    if (!pm) continue;
    ev.push({ type: 'clash', x: p.x, y: p.y });
    if (pm >= p.prio) {
      p.hit.push(v.slot);
      return beaten(p);
    }
    recoil(v, p.x);
    boxes[v.slot] = [];
  }
  return false;
}

/** The boulder rolls (and the bomb comes to rest): on the floor or a platform it comes down onto, falling off their edges. */
function rollOnFloor(st: (typeof STAGES)[keyof typeof STAGES], p: ProjectileState, prevY: number) {
  if (p.vy > 0) return;
  const r = PROJ_R[p.kind];
  for (const sf of [{ x1: st.main.x1, x2: st.main.x2, y: 0 }, ...st.plats]) {
    if (p.x < sf.x1 || p.x > sf.x2) continue;
    if (prevY - r >= sf.y - 0.01 && p.y - r <= sf.y) {
      p.y = sf.y + r;
      p.vy = 0;
      return;
    }
  }
}

/** A bomb going off: a blast in its place, with the bomb's hit. */
function explode(p: ProjectileState, keep: ProjectileState[], ev: SimEvent[]) {
  keep.push({ ...p, kind: 'blast', vx: 0, vy: 0, t: 0, hit: [], clashed: [] });
  ev.push({ type: 'blast', x: p.x, y: p.y });
}

/** Returns true when the projectile is used up. */
function projectileHits(s: MatchState, p: ProjectileState, joints: ReturnType<typeof jointsOf>[], ev: SimEvent[]): boolean {
  // A bomb hits nothing until it goes off.
  if (p.kind === 'bomb') return false;
  const r = PROJ_R[p.kind] * p.size;
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
    if (!touches(projShape(p), hurtOf(v, j))) continue;
    p.hit.push(v.slot);
    const owner = s.fighters[p.owner];
    // Some projectiles hit harder right after leaving the hand.
    const k = p.nearT > 0 && p.t < p.nearT ? 1 - p.t / p.nearT : 0;
    const strike = k > 0 ? { ...p, bkb: p.bkb + (p.nearBkb - p.bkb) * k, kbg: p.kbg + (p.nearKbg - p.kbg) * k } : p;
    // A blast throws everyone away from where it went off.
    applyHit(s, null, v, strike, p.kind === 'blast' ? (v.x >= p.x ? 1 : -1) : p.dir, p.x, p.y, ev);
    // Credit the thrower (for who knocked whom out); projectiles cause no hitlag for the thrower.
    v.lastHitBy = owner.slot;
    if (!KEEPS.includes(p.kind) && p.kind !== 'blast' && p.kind !== 'boomerang') {
      if (p.kind === 'boulder') ev.push({ type: 'shatter', x: p.x, y: p.y, kind: p.kind });
      return true;
    }
  }
  return false;
}
