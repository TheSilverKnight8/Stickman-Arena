import { CHARS } from '../sim/chars';
import { hidden, hitsOf, hurtOf, jointsOf, moveOf } from '../sim/body';
import type { Joints } from '../sim/skeleton';
import { STAGES } from '../sim/stages';
import { BOMB_FUSE, projShape, step, tetherLine } from '../sim/step';
import type { Act, FighterState, MatchState, ProjectileState, SimEvent } from '../sim/types';
import { drawScenery } from './backdrops';
import { CREAM, NAVY, RED, drawFigure, drawSword, fighterColor, shade } from './figure';

// Draws a match: the stage, fighters, projectiles, effects and the HUD.
// Nothing here changes the match; effects and the camera live only on screen.
//
// Two kinds of effects: hit effects (sparks, KO bursts, the kill spark) and
// movement and move effects (jump puffs, dash dust, fast-fall streaks,
// afterimages on dodges and travelling moves, swing trails).

interface Effect {
  kind: 'spark' | 'ko' | 'dust' | 'shatter' | 'flash' | 'puff' | 'armor' | 'jumpdust' | 'ring' | 'dash' | 'streak' | 'clash' | 'ember' | 'boom';
  x: number;
  y: number;
  t: number;
  life: number;
  size: number;
  angle: number;
  color: string;
  /** Facing, for effects that point one way (dash dust). */
  dir?: number;
}

/** What the renderer remembers about each fighter from the frames before (for movement effects). */
interface Track {
  act: Act;
  facing: number;
  fastFall: boolean;
  hidden: boolean;
  /** Recent poses, newest last (afterimages). */
  ghosts: Joints[];
  /** Recent lead points of an active hitbox, newest last (swing trails); null on frames with no hitbox. */
  trail: ([number, number, number] | null)[];
}

/** A hit that will KO: the background changes to the attacker's colour for a moment. */
interface KillSpark {
  x: number;
  y: number;
  t: number;
  life: number;
  spin: number;
  color: string;
}

/** Hits with less knockback than this are never checked for a KO. */
const KILL_CHECK_KB = 60;
/** How far ahead (frames) to look for the KO. */
const KILL_LOOKAHEAD = 150;

export interface PlayerLabel {
  name: string;
  /** The player on this device. */
  you: boolean;
}

/** How a match is shown, beyond the defaults. */
export interface SceneOptions {
  /** Training: no clock or stocks in the HUD. */
  training?: boolean;
  /** Draw hurtboxes and hitboxes (read every frame, so it can be switched while playing). */
  showBoxes?: () => boolean;
}

export class Scene {
  private ctx: CanvasRenderingContext2D;
  private effects: Effect[] = [];
  private cam = { x: 0, y: 120, zoom: 0.5, ready: false };
  private shake = 0;
  private time = 0;
  /** Damage shown in the HUD bounces when it goes up. */
  private bump: number[] = [];
  private lastDamage: number[] = [];
  private tracks: (Track | undefined)[] = [];
  private kill: KillSpark | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private labels: PlayerLabel[],
    private options: SceneOptions = {},
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Called once per simulation frame: turns events into effects and follows each fighter's movement. */
  onEvents(s: MatchState, events: SimEvent[]) {
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          const big = e.kb > 90;
          if (e.kb >= KILL_CHECK_KB && this.willKo(s, e.victim)) {
            // Projectiles credit their thrower.
            const by = e.attacker >= 0 ? e.attacker : s.fighters[e.victim].lastHitBy;
            const color = by >= 0 ? this.colorOf(s.fighters[by]) : RED;
            this.kill = { x: e.x, y: e.y, t: 0, life: 44, spin: (this.time * 0.7) % 6.28, color };
            this.add('spark', e.x, e.y, 26, 70, color);
            this.add('flash', e.x, e.y, 22, 70, CREAM);
            this.shake = Math.max(this.shake, 20);
            break;
          }
          this.add('spark', e.x, e.y, big ? 18 : 12, Math.min(48, 18 + e.dmg * 2.2), RED);
          if (big) this.shake = Math.max(this.shake, Math.min(14, e.kb / 12));
          break;
        }
        case 'jump': {
          const f = s.fighters[e.slot];
          if (e.double) this.add('ring', f.x, f.y + 4, 18, CHARS[f.char].halfWidth * 3, this.colorOf(f));
          else this.add('jumpdust', f.x, f.y, 14, 1, NAVY);
          break;
        }
        case 'dodge': {
          const f = s.fighters[e.slot];
          this.add('puff', f.x, f.y + CHARS[f.char].height * 0.5, 12, 26, shade(CREAM, -0.2));
          break;
        }
        case 'ledge': {
          const f = s.fighters[e.slot];
          this.add('flash', f.x, f.y + CHARS[f.char].height * 0.85, 10, 18, NAVY);
          break;
        }
        case 'shoot': {
          const p = [...s.projectiles].reverse().find((q) => q.owner === e.slot);
          if (p) this.add('flash', p.x, p.y, 8, 14, this.colorOf(s.fighters[e.slot]));
          break;
        }
        case 'armor':
          this.add('armor', e.x, e.y, 14, 34, '#ffd43b');
          break;
        case 'ko': {
          const f = s.fighters[e.slot];
          this.add('ko', e.x, e.y, 50, 1, this.colorOf(f));
          this.shake = 18;
          break;
        }
        case 'land':
          this.add('dust', e.x, e.y, 14, 1, NAVY);
          break;
        case 'shatter':
          this.add('shatter', e.x, e.y, 26, 1, '#b07a3b');
          break;
        case 'reflect':
          this.add('flash', e.x, e.y, 12, 40, '#9ad7ff');
          break;
        case 'teleport':
          this.add('puff', e.x, e.y + 45, 18, 30, CHARS.phantom.color);
          break;
        case 'clash':
          // Two attacks meeting: a cream flash with navy rays.
          this.add('clash', e.x, e.y, 14, 30, NAVY);
          break;
        case 'grab': {
          const f = s.fighters[e.slot];
          this.add('flash', f.x + f.facing * 30, f.y + CHARS[f.char].height * 0.5, 10, 26, this.colorOf(f));
          break;
        }
        case 'blast':
          // Ranger's bomb going off: a fireball the size of the blast, then smoke.
          this.add('boom', e.x, e.y, 30, 64, '#ff9f1c');
          this.add('flash', e.x, e.y, 14, 80, CREAM);
          this.shake = Math.max(this.shake, 12);
          break;
      }
    }
    this.track(s);
  }

  /** Follows each fighter from frame to frame for the movement effects. */
  private track(s: MatchState) {
    for (const f of s.fighters) {
      const was = this.tracks[f.slot];
      const j = f.act === 'dead' || f.act === 'out' ? null : jointsOf(f);
      const isHidden = hidden(f);
      const tr: Track = was ?? { act: f.act, facing: f.facing, fastFall: f.fastFall, hidden: isHidden, ghosts: [], trail: [] };
      if (was) {
        const c = CHARS[f.char];
        // Dust kicked up when a run starts or turns around.
        if (f.act === 'run' && (was.act !== 'run' || was.facing !== f.facing)) {
          this.effects.push({ kind: 'dash', x: f.x - f.facing * c.halfWidth, y: f.y, t: 0, life: 16, size: 1, angle: 0, color: NAVY, dir: f.facing });
        }
        // A streak above the head when a fast fall starts.
        if (f.fastFall && !was.fastFall) this.add('streak', f.x, f.y + c.height, 12, c.height * 0.6, this.colorOf(f));
        // Reappearing after a teleport.
        if (was.hidden && !isHidden && j) this.add('puff', f.x, f.y + 45, 18, 30, this.colorOf(f));
      }
      tr.act = f.act;
      tr.facing = f.facing;
      tr.fastFall = f.fastFall;
      tr.hidden = isHidden;
      if (j && !isHidden) tr.ghosts.push(j);
      else tr.ghosts.length = 0;
      if (tr.ghosts.length > 8) tr.ghosts.shift();
      const lead = j && !isHidden ? hitsOf(f, j)[0] : undefined;
      tr.trail.push(lead ? [lead.shape[2], lead.shape[3], lead.shape[4]] : null);
      if (tr.trail.length > 6) tr.trail.shift();
      this.tracks[f.slot] = tr;
    }
  }

  /**
   * Whether this hit's launch carries the fighter past a blast zone: plays a
   * copy of the match forward with nobody pressing anything. A fighter who is
   * no longer flying from the hit by then (and could still recover) does not count.
   */
  private willKo(s: MatchState, slot: number): boolean {
    const sim = structuredClone(s);
    const none = sim.fighters.map(() => 0);
    for (let i = 0; i < KILL_LOOKAHEAD; i++) {
      const v = sim.fighters[slot];
      const flying = v.act === 'hurt' || v.kbSpeed > 0.5 || v.hitlag > 0;
      if (!flying || sim.phase === 'over') return false;
      if (step(sim, none).some((e) => e.type === 'ko' && e.slot === slot)) return true;
    }
    return false;
  }

  private add(kind: Effect['kind'], x: number, y: number, life: number, size: number, color: string) {
    this.effects.push({ kind, x, y, t: 0, life, size, angle: (this.time * 37) % 360, color });
  }

  private colorOf(f: FighterState) {
    return fighterColor(CHARS[f.char], f.palette);
  }

  draw(s: MatchState) {
    this.time++;
    const canvas = this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const H = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = this.ctx;
    const st = STAGES[s.stage];
    this.updateCamera(s, W, H);

    // Background: the stage's scenery, the kill spark over it, then the portal's stripes.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f6e7cf';
    ctx.fillRect(0, 0, W, H);
    drawScenery(ctx, s.stage, W, H, this.cam, this.time);
    if (this.kill) this.drawKillSpark(W, H);
    this.drawBackdrop(W, H);

    // World transform: y up.
    const sx = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake * dpr : 0;
    const sy = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake * dpr : 0;
    this.shake *= 0.85;
    const z = this.cam.zoom;
    ctx.setTransform(z, 0, 0, -z, W / 2 - this.cam.x * z + sx, H / 2 + this.cam.y * z + sy);

    this.drawStage(st);
    for (const f of s.fighters) if (f.act === 'respawn') this.drawRespawnPlatform(f);
    for (const p of s.projectiles) if (p.kind !== 'bomb') this.drawProjectile(p, s);
    // The local player is drawn last, on top.
    const order = [...s.fighters].sort((a, b) => Number(this.labels[a.slot]?.you) - Number(this.labels[b.slot]?.you));
    for (const f of order) this.drawFighter(f, s);
    // Bombs on top, so one at someone's feet still shows.
    for (const p of s.projectiles) if (p.kind === 'bomb') this.drawProjectile(p, s);
    if (this.options.showBoxes?.()) this.drawBoxes(s);
    this.drawEffects();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawOffscreen(s, W, H, dpr);
    this.drawHud(s, W, H, dpr);
  }

  // ---------------------------------------------------------------- camera

  private updateCamera(s: MatchState, W: number, H: number) {
    const st = STAGES[s.stage];
    let x1 = st.main.x1 - 80;
    let x2 = st.main.x2 + 80;
    let y1 = st.main.bottom - 40;
    let y2 = 260;
    for (const f of s.fighters) {
      if (f.act === 'dead' || f.act === 'out') continue;
      x1 = Math.min(x1, f.x - 140);
      x2 = Math.max(x2, f.x + 140);
      y1 = Math.min(y1, f.y - 80);
      y2 = Math.max(y2, f.y + 200);
    }
    const b = st.blast;
    x1 = Math.max(x1, b.left);
    x2 = Math.min(x2, b.right);
    y1 = Math.max(y1, b.bottom);
    y2 = Math.min(y2, b.top);
    // Keep the HUD strip at the bottom clear.
    const hudRoom = 0.16;
    let zoom = Math.min(W / (x2 - x1), (H * (1 - hudRoom)) / (y2 - y1));
    zoom = Math.max(W / 2400, Math.min(zoom, W / 1100));
    const tx = (x1 + x2) / 2;
    const ty = (y1 + y2) / 2 - (H * hudRoom * 0.5) / zoom;
    if (!this.cam.ready) {
      this.cam = { x: tx, y: ty, zoom, ready: true };
      return;
    }
    const k = 0.1;
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    this.cam.zoom += (zoom - this.cam.zoom) * k;
  }

  private toScreen(x: number, y: number, W: number, H: number): [number, number] {
    const z = this.cam.zoom;
    return [W / 2 + (x - this.cam.x) * z, H / 2 - (y - this.cam.y) * z];
  }

  // ---------------------------------------------------------------- stage

  /** Faint staggered stripes behind everything, as on the portal's pages. */
  private drawBackdrop(W: number, H: number) {
    const ctx = this.ctx;
    const bar = Math.max(6, H * 0.018);
    const gap = bar * 0.6;
    ctx.globalAlpha = 0.09;
    const stripes = [
      [0, H * 0.12, 0.62],
      [0, H * 0.12 + bar + gap, 0.34],
      [0, H * 0.12 + 2 * (bar + gap), 0.48],
    ];
    stripes.forEach(([, y, len], i) => {
      ctx.fillStyle = i === 1 ? RED : NAVY;
      ctx.fillRect(0, y, W * len, bar);
    });
    ctx.globalAlpha = 1;
  }

  private drawStage(st: (typeof STAGES)[keyof typeof STAGES]) {
    const ctx = this.ctx;
    const m = st.main;
    // The slab, with a tapered underside so it reads as a floating stage.
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(m.x1, 0);
    ctx.lineTo(m.x2, 0);
    ctx.lineTo(m.x2 - 10, m.bottom);
    ctx.lineTo(m.x2 - 70, m.bottom - 70);
    ctx.lineTo(m.x1 + 70, m.bottom - 70);
    ctx.lineTo(m.x1 + 10, m.bottom);
    ctx.closePath();
    ctx.fill();
    // Red and cream stripes along the face.
    ctx.fillStyle = RED;
    ctx.fillRect(m.x1 + 30, -18, (m.x2 - m.x1) * 0.55, 8);
    ctx.fillStyle = CREAM;
    ctx.globalAlpha = 0.25;
    ctx.fillRect(m.x1 + 30, -32, (m.x2 - m.x1) * 0.8, 5);
    ctx.globalAlpha = 1;
    // Top edge.
    ctx.fillStyle = shade(NAVY, 0.25);
    ctx.fillRect(m.x1, -4, m.x2 - m.x1, 4);

    for (const p of st.plats) {
      ctx.fillStyle = NAVY;
      roundRect(ctx, p.x1, p.y - 9, p.x2 - p.x1, 9, 3);
      ctx.fill();
      ctx.fillStyle = RED;
      ctx.fillRect(p.x1 + 10, p.y - 6, (p.x2 - p.x1) * 0.35, 3);
    }
  }

  private drawRespawnPlatform(f: FighterState) {
    const ctx = this.ctx;
    ctx.fillStyle = this.colorOf(f);
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;
    roundRect(ctx, f.x - 34, f.y - 8, 68, 8, 3);
    ctx.fill();
    ctx.stroke();
  }

  // ---------------------------------------------------------------- fighters

  private drawFighter(f: FighterState, s: MatchState) {
    if (f.act === 'dead' || f.act === 'out') return;
    const c = CHARS[f.char];
    const j = jointsOf(f);
    if (!j) return;
    if (hidden(f)) return;
    if (f.tLen > 0 || f.tSlot >= 0 || f.tLedge !== 0) this.drawTether(f, j, s);
    let alpha = 1;
    if (f.act === 'dodge' || f.act === 'airdodge') alpha = 0.45;
    const m = moveOf(f);
    // Ranger's dagger is out during the moves that use it.
    const dagger = !!m?.hits?.some((h) => h.at === 'tip2' || h.to === 'tip2');
    const tr = this.tracks[f.slot];
    // Afterimages while dodging or during a move that carries the fighter fast.
    if (tr && (f.act === 'dodge' || f.act === 'airdodge' || (f.act === 'move' && (Math.abs(f.vx) > 8.5 || m?.teleport)))) {
      const g = tr.ghosts;
      [
        [g.length - 3, 0.26],
        [g.length - 5, 0.17],
        [g.length - 7, 0.09],
      ].forEach(([i, a]) => {
        if (i >= 0) drawFigure(this.ctx, c, g[i], { color: this.colorOf(f), alpha: a, noWeapon: f.weaponOut, time: this.time, facing: f.facing, airborne: !f.grounded, gliding: f.act === 'glide', dagger });
      });
    }
    // Swing trail: a fading smear along the path of the attack's leading hitbox.
    if (tr && tr.trail.some(Boolean)) this.drawTrail(tr.trail, this.colorOf(f));
    if (m?.intangible && f.t >= m.intangible[0] && f.t <= m.intangible[1]) alpha = 0.55;
    // Respawn invincibility blinks.
    if ((f.invincible > 0 || f.act === 'respawn') && Math.floor(this.time / 4) % 2 === 0) alpha = Math.min(alpha, 0.55);
    drawFigure(this.ctx, c, j, {
      color: this.colorOf(f),
      alpha,
      flash: f.hitlag > 0 && f.act === 'hurt' && f.hitlag % 4 < 2,
      noWeapon: f.weaponOut,
      time: this.time,
      facing: f.facing,
      airborne: !f.grounded,
      gliding: f.act === 'glide',
      flare: c.id === 'valkyrie' && f.act === 'move' && (f.move === 'utilt' || f.move === 'nspec') && f.t >= 5 && f.t <= 14,
      dagger,
    });
    // Fisticuffs' Haymaker: the fist catches fire as it winds up and blazes through the punch.
    if (c.id === 'fisticuffs' && f.act === 'move' && f.move === 'nspec' && m) this.drawFlames(f, j, m.total);
    // Armor: a yellow glow while armored frames are on.
    const armored = (m?.armor && f.t >= m.armor[0] && f.t <= m.armor[1]) || (m?.superArmor && f.t >= m.superArmor[0] && f.t <= m.superArmor[1]);
    if (armored) {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(255, 212, 59, 0.75)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(j.hip[0], j.hip[1] + 20, c.halfWidth * 2.4, c.height * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Ranger's bomb in her hand until she lets it go.
    const thrown = m?.proj?.find((q) => q.kind === 'bomb');
    if (thrown && f.t < thrown.f) this.drawBomb(j.hand2[0], j.hand2[1], false);
    // Charging: green wind gathering around the bow, wider and stronger as the charge grows.
    if (f.charge > 0 && m?.charge) this.drawWind(j.hand1[0], j.hand1[1], f.charge / m.charge.max, this.time * 0.35);
  }

  /** Training: hurtboxes (blue outlines), hitboxes (red; command grabs yellow) and projectiles' hit areas. */
  private drawBoxes(s: MatchState) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 2;
    for (const f of s.fighters) {
      if (f.act === 'dead' || f.act === 'out' || hidden(f)) continue;
      const j = jointsOf(f);
      if (!j) continue;
      ctx.strokeStyle = 'rgba(30, 110, 255, 0.8)';
      ctx.fillStyle = 'rgba(30, 110, 255, 0.12)';
      for (const h of hurtOf(f, j)) {
        capsule(ctx, h);
        ctx.fill();
        ctx.stroke();
      }
      for (const h of hitsOf(f, j)) {
        ctx.strokeStyle = h.def.grab ? 'rgba(200, 150, 0, 0.95)' : 'rgba(220, 0, 0, 0.95)';
        ctx.fillStyle = h.def.grab ? 'rgba(255, 212, 59, 0.4)' : 'rgba(252, 63, 63, 0.4)';
        capsule(ctx, h.shape);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.strokeStyle = 'rgba(220, 0, 0, 0.95)';
    ctx.fillStyle = 'rgba(252, 63, 63, 0.35)';
    for (const p of s.projectiles) {
      capsule(ctx, projShape(p));
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A ghostly chain from Phantom's hand to the tether's tip (or to what it caught). */
  private drawTether(f: FighterState, j: Joints, s: MatchState) {
    let tip: [number, number];
    const m = moveOf(f);
    if (m?.pull && f.tSlot >= 0) {
      const v = s.fighters[f.tSlot];
      tip = [v.x, v.y + CHARS[v.char].height * 0.55];
    } else if (m?.pull && f.tLedge !== 0) {
      const main = STAGES[s.stage].main;
      tip = [f.tLedge > 0 ? main.x2 : main.x1, 0];
    } else {
      if (f.tLen <= 0) return;
      const [, , x, y] = tetherLine(f, j);
      tip = [x, y];
    }
    const from = j.hand1;
    const ctx = this.ctx;
    const color = this.colorOf(f);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.setLineDash([9, 6]);
    ctx.lineDashOffset = -this.time * 2;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.lineTo(tip[0], tip[1]);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    // The hook.
    ctx.fillStyle = CREAM;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tip[0], tip[1], 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** Flames around Fisticuffs' fist during the Haymaker (embers drift off it too). */
  private drawFlames(f: FighterState, j: Joints, total: number) {
    const ctx = this.ctx;
    const t = f.t;
    // Builds up during the wind-up, blazes on the punch, dies down after.
    const k = t < 18 ? 0.35 + (t / 18) * 0.45 : t <= 26 ? 1 : Math.max(0, 1 - (t - 26) / (total - 26));
    if (k <= 0) return;
    const [hx, hy] = j.hand1;
    ctx.save();
    const layers: [string, number][] = [
      ['#e8352f', 1],
      ['#ff9f1c', 0.72],
      ['#ffe066', 0.45],
    ];
    for (const [col, sz] of layers) {
      ctx.fillStyle = col;
      ctx.strokeStyle = NAVY;
      ctx.lineWidth = col === '#e8352f' ? 2.5 : 0;
      ctx.beginPath();
      const r = 15 * k * sz;
      // A flickering teardrop pointing up and back.
      const flick = Math.sin(this.time * 0.9 + sz * 5) * 4 * k;
      ctx.moveTo(hx - r, hy);
      ctx.quadraticCurveTo(hx - r, hy + r * 1.4, hx - f.facing * 6 + flick, hy + r * 2.6);
      ctx.quadraticCurveTo(hx + r, hy + r * 1.4, hx + r, hy);
      ctx.arc(hx, hy, r, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      if (col === '#e8352f') ctx.stroke();
    }
    ctx.restore();
    if (this.time % 2 === 0) {
      this.effects.push({ kind: 'ember', x: hx + (Math.random() - 0.5) * 14, y: hy + (Math.random() - 0.5) * 10, t: 0, life: 16 + Math.floor(Math.random() * 10), size: 3 + Math.random() * 4 * k, angle: 0, color: Math.random() < 0.5 ? '#ff9f1c' : '#ffd43b', dir: -f.facing });
    }
  }

  /** A round bomb with a lit fuse (red when blinking). */
  private drawBomb(x: number, y: number, blink: boolean) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = blink ? RED : NAVY;
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(250, 238, 218, 0.55)';
    ctx.beginPath();
    ctx.arc(x - 4, y + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 10);
    ctx.quadraticCurveTo(x + 6, y + 18, x + 11, y + 17);
    ctx.stroke();
    ctx.fillStyle = Math.floor(this.time / 2) % 2 ? '#ffd43b' : '#ff9f1c';
    ctx.beginPath();
    ctx.arc(x + 12, y + 17, 3 + (this.time % 3), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Green wind swirling around a point (Ranger's charge): `k` 0..1 sets its size and strength. */
  private drawWind(x: number, y: number, k: number, spin: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    const r = 16 + 30 * k;
    ctx.fillStyle = `rgba(110, 214, 130, ${0.12 + 0.18 * k})`;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const a = spin + (i * Math.PI) / 2;
      ctx.strokeStyle = `rgba(70, 190, 100, ${0.6 + 0.4 * k})`;
      ctx.lineWidth = 3 + 4 * k;
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.7 + 0.12 * i), a, a + 1.1 + 0.6 * k);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawTrail(trail: Track['trail'], color: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      if (!a || !b) continue;
      const k = i / trail.length;
      ctx.globalAlpha = 0.32 * k;
      ctx.lineWidth = b[2] * 1.3 * (0.4 + 0.6 * k);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- kill spark

  /** The background turns red with rays from the hit, then fades back. */
  private drawKillSpark(W: number, H: number) {
    const k = this.kill!;
    k.t++;
    if (k.t >= k.life) {
      this.kill = null;
      return;
    }
    const p = k.t / k.life;
    const a = p < 0.2 ? 1 : 1 - (p - 0.2) / 0.8;
    const ctx = this.ctx;
    const [hx, hy] = this.toScreen(k.x, k.y, W, H);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = k.color;
    ctx.fillRect(0, 0, W, H);
    ctx.translate(hx, hy);
    ctx.rotate(k.spin + k.t * 0.004);
    const R = Math.hypot(W, H);
    const rays = 18;
    for (let i = 0; i < rays; i++) {
      const a0 = (i / rays) * Math.PI * 2;
      const w = (Math.PI / rays) * (i % 2 === 0 ? 0.55 : 0.3);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 38, 87, 0.45)' : 'rgba(250, 238, 218, 0.35)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a0 - w) * R, Math.sin(a0 - w) * R);
      ctx.lineTo(Math.cos(a0 + w) * R, Math.sin(a0 + w) * R);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- projectiles

  private drawProjectile(p: ProjectileState, s: MatchState) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    switch (p.kind) {
      case 'arrow': {
        const len = Math.hypot(p.vx, p.vy) || 1;
        // A charged arrow is drawn bigger (as big as it hits), wrapped in green wind.
        const k = (p.size - 1) / 1.2;
        if (k > 0.05) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(Math.atan2(p.vy, p.vx));
          ctx.fillStyle = `rgba(110, 214, 130, ${0.18 + 0.2 * k})`;
          ctx.beginPath();
          ctx.ellipse(-14 * p.size, 0, 26 * p.size, (8 + 8 * k) * p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 3; i++) {
            const off = ((this.time * 6 + i * 14) % 42) + 6;
            ctx.strokeStyle = `rgba(70, 190, 100, ${(0.6 + 0.4 * k) * (1 - off / 56)})`;
            ctx.lineWidth = 3 + 4 * k;
            ctx.beginPath();
            // Curls on alternating sides of the shaft.
            ctx.ellipse(-off * p.size, 0, 7 + 9 * k, 5 + 4 * k, 0, i % 2 ? 0 : Math.PI, i % 2 ? Math.PI : Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.translate(p.x, p.y);
        ctx.scale(p.size, p.size);
        ctx.translate(-p.x, -p.y);
        const ux = p.vx / len;
        const uy = p.vy / len;
        const tail: [number, number] = [p.x - ux * 34, p.y - uy * 34];
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tail[0], tail[1]);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.fillStyle = NAVY;
        ctx.beginPath();
        ctx.moveTo(p.x + ux * 8, p.y + uy * 8);
        ctx.lineTo(p.x - ux * 3 - uy * 6, p.y - uy * 3 + ux * 6);
        ctx.lineTo(p.x - ux * 3 + uy * 6, p.y - uy * 3 - ux * 6);
        ctx.fill();
        ctx.strokeStyle = this.colorOf(s.fighters[p.owner]);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tail[0], tail[1]);
        ctx.lineTo(tail[0] + ux * 9, tail[1] + uy * 9);
        ctx.stroke();
        break;
      }
      case 'sword': {
        // Point first along its aim the whole way, out and back: no spin.
        const half = 49;
        drawSword(ctx, [p.x - p.ux * half, p.y - p.uy * half], [p.x + p.ux * half, p.y + p.uy * half], half * 2);
        break;
      }
      case 'toss': {
        // Tossed up, spinning end over end.
        const half = 47;
        const a = p.t * 0.42 * p.dir;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        drawSword(ctx, [p.x - ux * half, p.y - uy * half], [p.x + ux * half, p.y + uy * half], half * 2);
        break;
      }
      case 'orb': {
        const pulse = 1 + Math.sin(this.time * 0.3) * 0.12;
        ctx.fillStyle = 'rgba(138, 63, 252, 0.25)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 20 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = this.colorOf(s.fighters[p.owner]);
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'boulder': {
        ctx.translate(p.x, p.y);
        ctx.rotate(-p.t * 0.17 * p.dir);
        ctx.fillStyle = '#b07a3b';
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        const pts = [19, 16, 20, 16, 18, 21, 16, 19];
        pts.forEach((r, i) => {
          const a = (i / pts.length) * Math.PI * 2;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 38, 87, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, 3);
        ctx.lineTo(3, -5);
        ctx.stroke();
        break;
      }
      case 'boomerang': {
        // A wooden boomerang spinning, with a band in Ranger's colour.
        ctx.translate(p.x, p.y);
        ctx.rotate(p.t * 0.55 * p.dir);
        const arm = (sx: number) => {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sx * 8, 10, sx * 18, 4);
          ctx.stroke();
        };
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 9;
        arm(1);
        arm(-1);
        ctx.strokeStyle = '#c8a165';
        ctx.lineWidth = 5;
        arm(1);
        arm(-1);
        ctx.fillStyle = this.colorOf(s.fighters[p.owner]);
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bomb': {
        // It blinks faster as the fuse runs out.
        const left = BOMB_FUSE - p.t;
        this.drawBomb(p.x, p.y, left < 40 && Math.floor(this.time / (left < 15 ? 2 : 4)) % 2 === 0);
        break;
      }
      case 'shock': {
        const k = 1 - p.t / 30;
        ctx.strokeStyle = `rgba(232, 165, 0, ${0.4 + k * 0.6})`;
        ctx.lineWidth = 5;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(p.x - p.dir * i * 9, p.y, 10 + i * 6, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- effects

  private drawEffects() {
    const ctx = this.ctx;
    const keep: Effect[] = [];
    for (const e of this.effects) {
      e.t++;
      const k = e.t / e.life;
      if (k >= 1) continue;
      keep.push(e);
      ctx.save();
      ctx.translate(e.x, e.y);
      switch (e.kind) {
        case 'spark': {
          // A star burst with rays.
          ctx.rotate((e.angle * Math.PI) / 180);
          const r = e.size * (0.6 + k * 0.6);
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = '#fff3c4';
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 4;
          star(ctx, r, r * 0.45, 8);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 3;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
            ctx.lineTo(Math.cos(a) * r * (1.5 + k), Math.sin(a) * r * (1.5 + k));
            ctx.stroke();
          }
          break;
        }
        case 'ko': {
          // Staggered stripes bursting from where the fighter left the screen.
          ctx.globalAlpha = 1 - k;
          const len = 200 + k * 700;
          const dir = Math.atan2(-e.y + 150, -e.x);
          ctx.rotate(dir);
          [
            [NAVY, 0, 1],
            [e.color, 30, 0.7],
            [NAVY, 60, 0.85],
            [RED, -30, 0.6],
          ].forEach(([col, off, l]) => {
            ctx.fillStyle = col as string;
            ctx.fillRect(0, (off as number) - 9, len * (l as number), 18);
          });
          break;
        }
        case 'dust':
          ctx.globalAlpha = (1 - k) * 0.5;
          ctx.fillStyle = shade(CREAM, -0.25);
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.arc(s * (10 + k * 30), 6 + k * 6, 7 * (1 - k * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case 'shatter':
          ctx.fillStyle = e.color;
          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 2;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI + 0.2;
            const d = k * 60;
            ctx.save();
            ctx.translate(Math.cos(a) * d, Math.sin(a) * d - k * k * 50);
            ctx.rotate(k * 5 + i);
            ctx.fillRect(-5, -5, 10, 10);
            ctx.strokeRect(-5, -5, 10, 10);
            ctx.restore();
          }
          break;
        case 'boom': {
          // A fireball that swells to the blast's size, then a puff of smoke that rises and fades.
          const fire = Math.min(1, k * 3);
          if (k < 0.45) {
            ctx.globalAlpha = 1 - k / 0.45;
            const r = e.size * (0.45 + 0.55 * fire);
            for (const [col, sz] of [
              ['#e8352f', 1],
              ['#ff9f1c', 0.74],
              ['#ffe066', 0.45],
            ] as [string, number][]) {
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.arc(0, 0, r * sz, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.strokeStyle = NAVY;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.globalAlpha = (1 - k) * 0.55;
          ctx.fillStyle = shade(CREAM, -0.35);
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2 + e.angle;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * e.size * 0.5 * k, Math.sin(a) * e.size * 0.3 * k + k * 40, e.size * 0.28 * (0.5 + k), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'flash':
        case 'armor':
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * (0.5 + k), 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'jumpdust':
          // Two puffs pushed out along the floor, and a short line under the feet.
          ctx.globalAlpha = (1 - k) * 0.75;
          ctx.fillStyle = shade(CREAM, -0.38);
          for (const s of [-1, 1]) {
            for (let i = 0; i < 2; i++) {
              ctx.beginPath();
              ctx.arc(s * (10 + i * 14 + k * 34), 6 + i * 4 + k * 4, (14 - i * 4) * (1 - k * 0.6), 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(-16 - k * 30, 1);
          ctx.lineTo(16 + k * 30, 1);
          ctx.stroke();
          break;
        case 'ring':
          // Double jump: a flat ring under the feet that widens and fades.
          ctx.globalAlpha = (1 - k) * 0.8;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(0, 0, e.size * (0.6 + k * 0.8), e.size * 0.22 * (0.6 + k * 0.8), 0, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'dash': {
          // Dust kicked back from the feet when a run starts.
          const d = -(e.dir ?? 1);
          ctx.globalAlpha = (1 - k) * 0.75;
          ctx.fillStyle = shade(CREAM, -0.38);
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(d * (8 + i * 15 + k * 26), 6 + i * 5 + k * 8, (13 - i * 3) * (1 - k * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'streak':
          // Fast fall: a short line above the head that shoots up and fades.
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(0, 6 + k * 20);
          ctx.lineTo(0, 6 + k * 20 + e.size * (1 - k));
          ctx.stroke();
          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 2;
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(s * 10, 2 + k * 14);
            ctx.lineTo(s * 10, 2 + k * 14 + e.size * 0.5 * (1 - k));
            ctx.stroke();
          }
          break;
        case 'clash': {
          // A cream star with navy rays shooting out both ways.
          ctx.rotate((e.angle * Math.PI) / 180);
          const r = e.size * (0.5 + k * 0.5);
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = CREAM;
          ctx.strokeStyle = NAVY;
          ctx.lineWidth = 3;
          star(ctx, r, r * 0.35, 4);
          ctx.fill();
          ctx.stroke();
          ctx.lineWidth = 4;
          for (const sgn of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(sgn * r * 0.9, 0);
            ctx.lineTo(sgn * r * (1.6 + k * 1.4), 0);
            ctx.stroke();
          }
          break;
        }
        case 'ember':
          // A spark of fire that rises and drifts back.
          ctx.globalAlpha = 1 - k;
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc((e.dir ?? 1) * k * 16, k * 26, e.size * (1 - k * 0.6), 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'puff':
          ctx.globalAlpha = (1 - k) * 0.7;
          ctx.fillStyle = e.color;
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * k * 30, Math.sin(a) * k * 30, 10 * (1 - k), 0, Math.PI * 2);
            ctx.fill();
          }
          break;
      }
      ctx.restore();
    }
    this.effects = keep;
  }

  // ---------------------------------------------------------------- screen overlays

  /** A bubble at the screen edge for fighters the camera cannot show. */
  private drawOffscreen(s: MatchState, W: number, H: number, dpr: number) {
    const ctx = this.ctx;
    for (const f of s.fighters) {
      if (f.act === 'dead' || f.act === 'out') continue;
      const [px, py] = this.toScreen(f.x, f.y + 45, W, H);
      const m = 30 * dpr;
      if (px > -10 && px < W + 10 && py > -10 && py < H + 10) continue;
      const cx = Math.max(m, Math.min(W - m, px));
      const cy = Math.max(m, Math.min(H - m, py));
      ctx.fillStyle = CREAM;
      ctx.strokeStyle = this.colorOf(f);
      ctx.lineWidth = 4 * dpr;
      ctx.beginPath();
      ctx.arc(cx, cy, 20 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = NAVY;
      ctx.font = `${14 * dpr}px Norwester, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.floor(f.damage)}%`, cx, cy + 1 * dpr);
    }
  }

  private drawHud(s: MatchState, W: number, H: number, dpr: number) {
    const ctx = this.ctx;
    ctx.textBaseline = 'alphabetic';
    // Clock (none in training).
    const secs = Math.ceil(Math.max(0, s.clock) / 60);
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    ctx.textAlign = 'center';
    ctx.font = `${26 * dpr}px Norwester, sans-serif`;
    ctx.fillStyle = secs <= 10 && s.phase === 'play' ? RED : NAVY;
    if (!this.options.training && s.timed) ctx.fillText(clock, W / 2, 36 * dpr);
    if (s.suddenDeath) {
      ctx.font = `${13 * dpr}px Norwester, sans-serif`;
      ctx.fillStyle = RED;
      ctx.fillText('SUDDEN DEATH', W / 2, 54 * dpr);
    }

    // Player cards along the bottom.
    const n = s.fighters.length;
    const cw = Math.min(170 * dpr, (W * 0.5) / n);
    const ch = 58 * dpr;
    const gap = 10 * dpr;
    const total = n * cw + (n - 1) * gap;
    let x = W / 2 - total / 2;
    const y = H - ch - 10 * dpr;
    s.fighters.forEach((f, i) => {
      if (this.lastDamage[i] !== undefined && f.damage > this.lastDamage[i]) this.bump[i] = 10;
      this.lastDamage[i] = f.damage;
      this.bump[i] = Math.max(0, (this.bump[i] ?? 0) - 1);
      this.drawCard(f, x, y, cw, ch, dpr, this.bump[i]);
      x += cw + gap;
    });

    // Countdown, GO, GAME, SUDDEN DEATH.
    let big: string | null = null;
    let color = NAVY;
    if (s.phase === 'countdown') {
      const n = 3 - Math.floor(s.phaseT / 60);
      big = n > 0 ? String(n) : null;
    } else if (s.phase === 'play' && s.phaseT < 50) {
      big = 'GO!';
      color = RED;
    } else if (s.phase === 'sudden-intro') {
      big = 'SUDDEN DEATH';
      color = RED;
    } else if (s.phase === 'over') {
      big = 'GAME!';
      color = RED;
    }
    if (big) {
      const size = (big.length > 4 ? 64 : 120) * dpr * Math.min(1, W / (900 * dpr) + 0.25);
      ctx.font = `${size}px Norwester, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 10 * dpr;
      ctx.strokeStyle = CREAM;
      ctx.lineJoin = 'round';
      ctx.strokeText(big, W / 2, H * 0.42);
      ctx.fillStyle = color;
      ctx.fillText(big, W / 2, H * 0.42);
    }
  }

  private drawCard(f: FighterState, x: number, y: number, w: number, h: number, dpr: number, bump: number) {
    const ctx = this.ctx;
    const c = CHARS[f.char];
    const color = this.colorOf(f);
    const label = this.labels[f.slot];
    ctx.globalAlpha = f.act === 'out' ? 0.45 : 1;
    ctx.fillStyle = 'rgba(255, 248, 238, 0.92)';
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 2 * dpr;
    roundRect(ctx, x, y, w, h, 8 * dpr);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    roundRect(ctx, x, y, 7 * dpr, h, 4 * dpr);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = NAVY;
    ctx.font = `${11 * dpr}px Norwester, sans-serif`;
    ctx.fillText(`${label?.name ?? `P${f.slot + 1}`} · ${c.name}`.toUpperCase(), x + 14 * dpr, y + 16 * dpr);

    // Damage: navy at 0%, turning red as it climbs.
    const k = Math.min(1, f.damage / 150);
    ctx.fillStyle = k < 0.5 ? NAVY : RED;
    const pop = 1 + bump * 0.03;
    ctx.font = `${30 * dpr * pop}px Norwester, sans-serif`;
    ctx.fillText(`${Math.floor(f.damage)}%`, x + 14 * dpr, y + 47 * dpr);

    // Stocks (none in training).
    ctx.textAlign = 'right';
    for (let i = 0; i < (this.options.training ? 0 : f.stocks); i++) {
      const sx = x + w - (12 + i * 16) * dpr;
      ctx.fillStyle = CREAM;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 * dpr;
      ctx.beginPath();
      ctx.arc(sx, y + 42 * dpr, 5.5 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
}

/** Traces a capsule (a segment with a radius). */
function capsule(ctx: CanvasRenderingContext2D, [ax, ay, bx, by, r]: [number, number, number, number, number]) {
  const a = Math.atan2(by - ay, bx - ax);
  ctx.beginPath();
  ctx.arc(ax, ay, r, a + Math.PI / 2, a + Math.PI * 1.5);
  ctx.arc(bx, by, r, a - Math.PI / 2, a + Math.PI / 2);
  ctx.closePath();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function star(ctx: CanvasRenderingContext2D, outer: number, inner: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (points * 2)) * Math.PI * 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}
