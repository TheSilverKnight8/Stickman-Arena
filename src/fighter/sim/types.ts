import type { Anim, Body, JointName } from './skeleton';

// ---------------------------------------------------------------- input

/** One frame of input for one player, as bits. Small enough to send every frame online. */
export const BTN = {
  left: 1,
  right: 2,
  up: 4,
  down: 8,
  attack: 16,
  special: 32,
  jump: 64,
  dodge: 128,
} as const;

// ---------------------------------------------------------------- characters

export type CharId = 'fisticuffs' | 'spartan' | 'ranger' | 'buster' | 'phantom' | 'valkyrie';

/** The 12 moves from the spec. */
export type MoveSlot = 'jab' | 'ftilt' | 'utilt' | 'dtilt' | 'nair' | 'fair' | 'uair' | 'dair' | 'nspec' | 'sspec' | 'uspec' | 'dspec';

export interface Stats {
  weight: number;
  /** Ground speed and how quickly it is reached / lost (units per frame). */
  run: number;
  groundAccel: number;
  friction: number;
  /** Air drift. */
  air: number;
  airAccel: number;
  airFriction: number;
  gravity: number;
  maxFall: number;
  fastFall: number;
  jump: number;
  shortHop: number;
  doubleJump: number;
  /** Jumps in the air before landing again (default 1, the double jump). */
  airJumps?: number;
  /** Frames crouched before leaving the ground. */
  squat: number;
}

/** A bomb sits until its fuse runs out, then becomes a blast (the explosion's hit area for a few frames). */
export type ProjKind = 'arrow' | 'sword' | 'orb' | 'boulder' | 'shock' | 'toss' | 'bomb' | 'blast';

/**
 * Priority when two attacks touch: 1 light, 2 medium, 3 heavy. The higher one
 * beats the lower (the lower move is stopped, a lower projectile is swatted
 * away); even moves trade (both carry on), even projectiles destroy each other,
 * and a projectile meeting an even move is destroyed while the move carries on.
 */
export type Prio = 1 | 2 | 3;

export interface HitDef {
  /** Active frames, inclusive. */
  f: [number, number];
  /** Where: a joint, or [x, y] from the hip (facing right, before scaling). */
  at: JointName | [number, number];
  /** Optional second point: the hitbox is a capsule from `at` to `to`. */
  to?: JointName | [number, number];
  r: number;
  dmg: number;
  /** Launch angle: 0 = forward, 90 = up, -90 = down, 180 = backward. */
  ang: number;
  /** Base knockback and knockback growth. */
  bkb: number;
  kbg: number;
  /** Hits in the same group share one "already hit" record. */
  group?: number;
  /** Can hit the same fighter again after this many frames (multi-hit moves). */
  rehit?: number;
  /** Launch away from the attacker's centre instead of in the facing direction. */
  away?: boolean;
  /** Launch toward the attacker's centre: pulls the opponent in. */
  pull?: boolean;
  /** Hitstun multiplier (default 1). */
  hitstun?: number;
  /** Priority for this hitbox, if different from the move's. */
  prio?: Prio;
  /** A command grab: catching the opponent starts this move (the throw). Grabs never clash. */
  grab?: string;
}

export interface ProjSpawn {
  f: number;
  kind: ProjKind;
  /** From the hip, facing right, before scaling. */
  x: number;
  y: number;
  /** Speed along the aim. */
  speed: number;
  /** Aim angle: 0 = forward, 90 = up. */
  ang: number;
  dmg: number;
  hitAng: number;
  bkb: number;
  kbg: number;
  /** Hitstun multiplier (default 1). */
  hitstun?: number;
  /** Priority (default: the move's). */
  prio?: Prio;
  /** Stronger knockback when it hits soon after leaving the hand, fading to the normal values over `frames`. */
  near?: { bkb: number; kbg: number; frames: number };
}

export interface VelDef {
  f: number;
  /** Forward speed (facing is applied). */
  vx?: number;
  vy?: number;
  /** Add to the current speed instead of replacing it. */
  add?: boolean;
  /** Only on the ground / only in the air. */
  when?: 'ground' | 'air';
}

export interface MoveDef {
  name: string;
  /** Frames until the move ends. */
  total: number;
  anim: Anim;
  hits?: HitDef[];
  vel?: VelDef[];
  proj?: ProjSpawn[];
  /** Frames with armor: hits below the armor threshold do damage but no knockback. */
  armor?: [number, number];
  /** Frames with super armor: every hit does damage but no knockback or hitstun. */
  superArmor?: [number, number];
  /** Frames held in place: no speed, gravity or drift. */
  still?: [number, number];
  /** Frames where the fighter cannot be hit. */
  intangible?: [number, number];
  /** Frames where projectiles touching this circle are sent back. */
  reflect?: { f: [number, number]; x: number; y: number; r: number };
  /** Aerials: landing during the move ends it with this much landing lag. */
  landLag?: number;
  /** The move holds this frame until the fighter lands, then switches to `onLand`. */
  untilLand?: number;
  onLand?: string;
  /** Pressing attack again in this window switches to the chained move. */
  chain?: { into: string; window: [number, number] };
  /** Holding special keeps the move on frame `at` for up to `max` frames (charging). */
  charge?: { at: number; max: number };
  /** Gravity multiplier during the move (frames). */
  gravity?: { f: [number, number]; mul: number };
  /** Air drift multiplier during the move. */
  drift?: number;
  /** Teleport on frame f by `dist` in the held direction (default up). */
  teleport?: { f: number; dist: number };
  /** Stops moving when it hits. */
  stopOnHit?: boolean;
  /** Spartan: needs the sword in hand. */
  needsWeapon?: boolean;
  /** Turns to face the held direction when the move starts (side moves). */
  turn?: boolean;
  /** Hidden (and intangible) between these frames: a teleport. */
  hidden?: [number, number];
  /** Priority of the move's hitboxes and projectiles (see Prio). */
  prio?: Prio;
  /** Holding up or down until the projectile leaves tilts the shot by this many degrees. */
  aim?: number;
  /** A throw (started by a grab): the opponent is held at `hold` until `release`, then hit. */
  throw?: { hold: JointName | [number, number]; release: number; dmg: number; ang: number; bkb: number; kbg: number; backward?: boolean };
  /** A tether thrown forward: catching an opponent starts `zip`, catching a ledge starts `reel`. */
  tether?: { f: [number, number]; len: number; speed: number; airAng: number; zip: string; reel: string };
  /** Flies toward the latched opponent (zip) or ledge (reel) at this speed, until frame `until`. */
  pull?: { kind: 'zip' | 'reel'; speed: number; until: number };
  /** On hitting, springs back off the opponent with this speed (forward is toward the opponent). */
  bounce?: { vx: number; vy: number };
  /** Ends in a glide instead of a normal fall. */
  glide?: boolean;
}

export interface CharDef {
  id: CharId;
  name: string;
  archetype: string;
  /** Main colour and the alternate for a second copy of the same character. */
  color: string;
  alt: string;
  body: Body;
  /** Line thickness for drawing. */
  line: number;
  stats: Stats;
  /** Line thickness for the arms, if different (Buster's big arms). */
  armLine?: number;
  /** Collision box: half width and height. */
  halfWidth: number;
  height: number;
  /** Projectile limit for this character (all kinds together, except Buster's shockwaves). */
  projLimit: number;
  /** Knockback below this is absorbed by armor. */
  armorKb: number;
  /** Knockback taken while standing on the ground is multiplied by this (default 1). */
  groundKb?: number;
  anims: {
    idle: Anim;
    run: Anim;
    squat: Anim;
    rise: Anim;
    fall: Anim;
    land: Anim;
    hurt: Anim;
    tumble: Anim;
    dodge: Anim;
    airdodge: Anim;
    djump: Anim;
    ledge: Anim;
    climb: Anim;
    /** Gliding (Valkyrie). */
    glide?: Anim;
  };
  moves: Record<MoveSlot, MoveDef> & Record<string, MoveDef>;
}

// ---------------------------------------------------------------- stages

export type StageId = 'flatline' | 'lookout' | 'twin-decks' | 'scaffold' | 'rafters';

export interface StageDef {
  id: StageId;
  name: string;
  about: string;
  /** The main stage: a solid slab. Top at y = 0. */
  main: { x1: number; x2: number; bottom: number };
  /** Pass-through platforms. */
  plats: { x1: number; x2: number; y: number }[];
  /** Beyond these, a fighter loses a stock. */
  blast: { left: number; right: number; top: number; bottom: number };
  spawns: [number, number][];
}

// ---------------------------------------------------------------- match state (plain data, copyable)

export type Act = 'idle' | 'run' | 'squat' | 'air' | 'land' | 'move' | 'hurt' | 'dodge' | 'airdodge' | 'ledge' | 'climb' | 'dead' | 'respawn' | 'out' | 'held' | 'glide';

export interface FighterState {
  slot: number;
  char: CharId;
  /** 1 for the second copy of a character (alternate colours). */
  palette: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Launch speed and direction from the last hit. */
  kbSpeed: number;
  kbX: number;
  kbY: number;
  facing: 1 | -1;
  act: Act;
  /** Frames in the current act. */
  t: number;
  move: string | null;
  grounded: boolean;
  /** -1 in the air, 0 on the main stage, 1+ on a platform. */
  surface: number;
  /** Air jumps left before landing again. */
  airJumps: number;
  upSpecial: boolean;
  airDodge: boolean;
  fastFall: boolean;
  /** Short hop: jump was let go during the squat. */
  shortHop: boolean;
  damage: number;
  stocks: number;
  hitstun: number;
  hitlag: number;
  landLag: number;
  /** Respawn invincibility. */
  invincible: number;
  /** Frames until the fighter reappears after losing a stock. */
  respawnIn: number;
  /** Platform drop-through: frames left and how long down has been held. */
  dropT: number;
  downHeld: number;
  /** Last frame's buttons, to find presses. */
  prev: number;
  /** Buffered button presses and frames left. */
  buf: number;
  bufT: number;
  /** Direction bits held when the buffer was filled. */
  bufDir: number;
  /** Hits already landed by the current move: [group, slot, frame]. */
  hitLog: number[];
  /** Charging frames held. */
  charge: number;
  /** Spartan's sword is flying. */
  weaponOut: boolean;
  /** Who last hit this fighter (for "self-destruct" vs KO, not used for scoring). */
  lastHitBy: number;
  /** Teleport direction and distance per frame. */
  tpX: number;
  tpY: number;
  /** Frames since a double jump (for its flip animation). */
  jumpAnim: number;
  /** The current move hit something and stopped (moves with stopOnHit). */
  halted: boolean;
  /** Which ledge the fighter holds or is climbing: -1 left, 1 right, 0 none. */
  ledgeSide: number;
  /** Frames until a ledge can be grabbed again. */
  regrab: number;
  /** The next ledge grab gives a moment of invincibility (reset by landing or being hit). */
  ledgeFresh: boolean;
  /** Directions already held when the ledge was grabbed; they count only after being let go. */
  ledgeLock: number;
  /** An aerial that landed before its hit was over carries on until this move frame, then lands (-1: not landed). */
  landAt: number;
  /** Armor has already taken a hit during the current move (armor holds against one hit). */
  armorUsed: boolean;
  /** Aim of an aimable shot, in degrees (up is positive). */
  aim: number;
  /** Grabs: the slot holding this fighter, and the slot this fighter holds (-1: none). */
  heldBy: number;
  holding: number;
  /** Tether: current length and angle, and what it caught (a slot, or -1; ledge side -1/1, or 0). */
  tLen: number;
  tAng: number;
  tSlot: number;
  tLedge: number;
}

export interface ProjectileState {
  id: number;
  owner: number;
  kind: ProjKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 1 or -1: the way it faces, for launch angles. */
  dir: 1 | -1;
  /** The aim it was thrown along, as a unit vector (the thrown sword flies out and back along it). */
  ux: number;
  uy: number;
  t: number;
  dmg: number;
  ang: number;
  bkb: number;
  kbg: number;
  /** Hitstun multiplier. */
  hitstun: number;
  /** Fighters already hit. */
  hit: number[];
  /** The sword is on its way back. */
  back: boolean;
  /** For shockwaves: the surface it runs along. */
  surface: number;
  prio: Prio;
  /** Close-range knockback (see ProjSpawn.near); nearT 0 means none. */
  nearBkb: number;
  nearKbg: number;
  nearT: number;
  /** Projectiles (ids) this one has already clashed with. */
  clashed: number[];
  /** Size against the kind's normal size (a charged arrow grows with the charge). */
  size: number;
}

export type MatchPhase = 'countdown' | 'play' | 'sudden-intro' | 'over';

export interface MatchState {
  frame: number;
  rng: number;
  stage: StageId;
  phase: MatchPhase;
  phaseT: number;
  /** Frames left on the clock. */
  clock: number;
  suddenDeath: boolean;
  fighters: FighterState[];
  projectiles: ProjectileState[];
  nextId: number;
  /** Slot of the winner, -1 for a draw, null while playing. */
  winner: number | null;
  /** How it ended. */
  endReason: 'stocks' | 'time' | 'sudden-time' | 'disconnect' | null;
}

// ---------------------------------------------------------------- events (for sound and effects, not part of the state)

export type SimEvent =
  | { type: 'hit'; x: number; y: number; dmg: number; kb: number; attacker: number; victim: number }
  | { type: 'armor'; x: number; y: number; victim: number }
  | { type: 'reflect'; x: number; y: number; slot: number }
  | { type: 'swing'; slot: number; heavy: boolean }
  | { type: 'shoot'; slot: number; kind: ProjKind }
  | { type: 'jump'; slot: number; double: boolean }
  | { type: 'land'; slot: number; x: number; y: number }
  | { type: 'dodge'; slot: number }
  | { type: 'ko'; slot: number; x: number; y: number }
  | { type: 'respawn'; slot: number }
  | { type: 'count'; n: number }
  | { type: 'go' }
  | { type: 'tick'; seconds: number }
  | { type: 'game' }
  | { type: 'sudden' }
  | { type: 'shatter'; x: number; y: number; kind: ProjKind }
  | { type: 'teleport'; slot: number; x: number; y: number }
  | { type: 'ledge'; slot: number }
  | { type: 'clash'; x: number; y: number }
  | { type: 'grab'; slot: number }
  | { type: 'blast'; x: number; y: number };
