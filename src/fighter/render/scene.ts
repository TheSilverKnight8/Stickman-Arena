import { CHARS } from '../sim/chars';
import { hidden, jointsOf, moveOf } from '../sim/body';
import { STAGES } from '../sim/stages';
import type { FighterState, MatchState, ProjectileState, SimEvent } from '../sim/types';
import { CREAM, NAVY, RED, drawFigure, drawSword, shade } from './figure';

// Draws a match: the stage, fighters, projectiles, hit effects and the HUD.
// Nothing here changes the match; effects and the camera live only on screen.

interface Effect {
  kind: 'spark' | 'ko' | 'dust' | 'shatter' | 'flash' | 'puff' | 'armor';
  x: number;
  y: number;
  t: number;
  life: number;
  size: number;
  angle: number;
  color: string;
}

export interface PlayerLabel {
  name: string;
  /** The player on this device. */
  you: boolean;
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

  constructor(
    private canvas: HTMLCanvasElement,
    private labels: PlayerLabel[],
  ) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Turns simulation events into on-screen effects. */
  onEvents(s: MatchState, events: SimEvent[]) {
    for (const e of events) {
      switch (e.type) {
        case 'hit': {
          const big = e.kb > 90;
          this.add('spark', e.x, e.y, big ? 18 : 12, Math.min(48, 18 + e.dmg * 2.2), RED);
          if (big) this.shake = Math.max(this.shake, Math.min(14, e.kb / 12));
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
      }
    }
  }

  private add(kind: Effect['kind'], x: number, y: number, life: number, size: number, color: string) {
    this.effects.push({ kind, x, y, t: 0, life, size, angle: (this.time * 37) % 360, color });
  }

  private colorOf(f: FighterState) {
    const c = CHARS[f.char];
    return f.palette === 0 ? c.color : c.alt;
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

    // Background.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#f6e7cf';
    ctx.fillRect(0, 0, W, H);
    this.drawBackdrop(W, H);

    // World transform: y up.
    const sx = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake * dpr : 0;
    const sy = this.shake > 0.3 ? (Math.random() - 0.5) * this.shake * dpr : 0;
    this.shake *= 0.85;
    const z = this.cam.zoom;
    ctx.setTransform(z, 0, 0, -z, W / 2 - this.cam.x * z + sx, H / 2 + this.cam.y * z + sy);

    this.drawStage(st);
    for (const f of s.fighters) if (f.act === 'respawn') this.drawRespawnPlatform(f);
    for (const p of s.projectiles) this.drawProjectile(p, s);
    // The local player is drawn last, on top.
    const order = [...s.fighters].sort((a, b) => Number(this.labels[a.slot]?.you) - Number(this.labels[b.slot]?.you));
    for (const f of order) this.drawFighter(f);
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

  private drawFighter(f: FighterState) {
    if (f.act === 'dead' || f.act === 'out') return;
    const c = CHARS[f.char];
    const j = jointsOf(f);
    if (!j) return;
    if (hidden(f)) return;
    let alpha = 1;
    if (f.act === 'dodge' || f.act === 'airdodge') alpha = 0.45;
    const m = moveOf(f);
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
    });
    // Armor: a yellow glow while armored frames are on.
    if (m?.armor && f.t >= m.armor[0] && f.t <= m.armor[1]) {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(255, 212, 59, 0.75)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(j.hip[0], j.hip[1] + 20, c.halfWidth * 2.4, c.height * 0.62, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Charging: a growing ring at the bow.
    if (f.charge > 0 && m?.charge) {
      const ctx = this.ctx;
      ctx.strokeStyle = RED;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(j.hand1[0], j.hand1[1], 6 + (f.charge / m.charge.max) * 18, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------- projectiles

  private drawProjectile(p: ProjectileState, s: MatchState) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';
    switch (p.kind) {
      case 'arrow': {
        const len = Math.hypot(p.vx, p.vy) || 1;
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
        // Point first the whole way, out and back: no spin.
        const half = 49;
        drawSword(ctx, [p.x - p.dir * half, p.y], [p.x + p.dir * half, p.y], half * 2);
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
        ctx.rotate(-p.t * 0.12 * p.dir);
        ctx.fillStyle = '#b07a3b';
        ctx.strokeStyle = NAVY;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        const pts = [22, 18, 23, 19, 21, 24, 18, 22];
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
        ctx.moveTo(-8, 4);
        ctx.lineTo(4, -6);
        ctx.stroke();
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
        case 'flash':
        case 'armor':
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, e.size * (0.5 + k), 0, Math.PI * 2);
          ctx.stroke();
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
    // Clock.
    const secs = Math.ceil(Math.max(0, s.clock) / 60);
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    ctx.textAlign = 'center';
    ctx.font = `${26 * dpr}px Norwester, sans-serif`;
    ctx.fillStyle = secs <= 10 && s.phase === 'play' ? RED : NAVY;
    ctx.fillText(clock, W / 2, 36 * dpr);
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

    // Stocks.
    ctx.textAlign = 'right';
    for (let i = 0; i < f.stocks; i++) {
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
