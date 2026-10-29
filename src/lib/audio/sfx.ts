import { getAudio } from './engine';

// Sound effects, made on the spot from oscillators and noise. Each one is a
// few short notes or bursts, so there are no audio files to download.

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);

interface ToneOpts {
  type?: OscillatorType;
  at?: number;
  dur?: number;
  gain?: number;
  /** End pitch for a slide, in Hz. */
  to?: number;
  attack?: number;
}

function tone(hz: number, o: ToneOpts = {}) {
  const a = getAudio();
  if (!a) return;
  const { ctx, effects } = a;
  const t = ctx.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.12;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'square';
  osc.frequency.setValueAtTime(hz, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
  const peak = o.gain ?? 0.18;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(effects);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

interface NoiseOpts {
  at?: number;
  dur?: number;
  gain?: number;
  filter?: BiquadFilterType;
  hz?: number;
  /** End filter frequency for a sweep. */
  toHz?: number;
  q?: number;
}

function noise(o: NoiseOpts = {}) {
  const a = getAudio();
  if (!a) return;
  const { ctx, effects } = a;
  const t = ctx.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.08;
  const src = ctx.createBufferSource();
  src.buffer = a.noise;
  const f = ctx.createBiquadFilter();
  f.type = o.filter ?? 'bandpass';
  f.frequency.setValueAtTime(o.hz ?? 2000, t);
  if (o.toHz) f.frequency.exponentialRampToValueAtTime(o.toHz, t + dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(effects);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

const notes = (ms: number[], o: ToneOpts & { step: number }) => ms.forEach((m, i) => tone(midiHz(m), { ...o, at: (o.at ?? 0) + i * o.step }));

export const sfx = {
  /** Menu buttons. */
  click() {
    tone(midiHz(84), { type: 'square', dur: 0.05, gain: 0.08 });
  },
  back() {
    tone(midiHz(76), { type: 'square', dur: 0.06, gain: 0.07 });
  },
  /** A card dealt from the main deck. */
  draw() {
    noise({ filter: 'highpass', hz: 3000, dur: 0.07, gain: 0.25 });
    tone(midiHz(91), { type: 'triangle', at: 0.03, dur: 0.06, gain: 0.08 });
  },
  /** A hand card slapped down. */
  play() {
    noise({ filter: 'lowpass', hz: 1400, dur: 0.09, gain: 0.45 });
    tone(midiHz(79), { type: 'square', at: 0.01, dur: 0.08, gain: 0.08 });
    tone(midiHz(86), { type: 'square', at: 0.06, dur: 0.08, gain: 0.07 });
  },
  stand() {
    notes([67, 74], { type: 'triangle', step: 0.08, dur: 0.16, gain: 0.2 });
  },
  bust() {
    tone(220, { type: 'sawtooth', dur: 0.45, to: 70, gain: 0.14 });
    noise({ filter: 'lowpass', hz: 600, dur: 0.3, gain: 0.25 });
  },
  shuffle() {
    for (let i = 0; i < 6; i++) noise({ filter: 'highpass', hz: 2500, at: i * 0.045, dur: 0.04, gain: 0.15 });
  },
  setWon() {
    notes([72, 76, 79, 84], { type: 'square', step: 0.07, dur: 0.14, gain: 0.1 });
  },
  setLost() {
    notes([72, 67, 63], { type: 'square', step: 0.11, dur: 0.18, gain: 0.09 });
  },
  setTied() {
    notes([69, 69], { type: 'triangle', step: 0.14, dur: 0.12, gain: 0.16 });
  },
  matchWon() {
    notes([60, 64, 67, 72, 67, 72, 76, 79], { type: 'square', step: 0.09, dur: 0.16, gain: 0.1 });
    notes([48, 55, 60], { type: 'triangle', step: 0.24, dur: 0.3, gain: 0.18 });
  },
  matchLost() {
    notes([67, 66, 65, 64], { type: 'square', step: 0.18, dur: 0.24, gain: 0.08 });
    tone(midiHz(40), { type: 'triangle', at: 0.6, dur: 0.6, gain: 0.2 });
  },
  /** A match that ends in a draw. */
  matchDrawn() {
    notes([67, 64, 67], { type: 'triangle', step: 0.12, dur: 0.16, gain: 0.16 });
  },
  /** Last seconds of your turn. */
  tick() {
    tone(midiHz(96), { type: 'square', dur: 0.03, gain: 0.05 });
  },
  /** Someone joined your room. */
  join() {
    notes([79, 84], { type: 'triangle', step: 0.07, dur: 0.12, gain: 0.18 });
  },
  error() {
    notes([58, 55], { type: 'square', step: 0.09, dur: 0.12, gain: 0.08 });
  },

  // ---- Platfighter

  /** A hit; `power` 0 (light) to 1 (a KO-strength launch). */
  hit(power: number) {
    const p = Math.max(0, Math.min(1, power));
    noise({ filter: 'lowpass', hz: 1800 + p * 2500, dur: 0.08 + p * 0.12, gain: 0.35 + p * 0.3 });
    tone(220 - p * 120, { type: 'square', dur: 0.06 + p * 0.1, to: 60, gain: 0.12 + p * 0.08 });
    if (p > 0.6) noise({ filter: 'bandpass', hz: 600, q: 0.7, at: 0.03, dur: 0.3, gain: 0.25 });
  },
  whiff(heavy: boolean) {
    noise({ filter: 'bandpass', hz: heavy ? 900 : 1600, toHz: heavy ? 300 : 700, q: 1.2, dur: heavy ? 0.2 : 0.11, gain: heavy ? 0.22 : 0.14 });
  },
  jump(double: boolean) {
    tone(double ? 420 : 300, { type: 'triangle', dur: 0.12, to: double ? 900 : 620, gain: 0.12 });
  },
  land() {
    noise({ filter: 'lowpass', hz: 500, dur: 0.06, gain: 0.18 });
  },
  dodge() {
    noise({ filter: 'highpass', hz: 2500, toHz: 6000, dur: 0.14, gain: 0.12 });
  },
  ko() {
    noise({ filter: 'lowpass', hz: 3000, toHz: 200, dur: 0.9, gain: 0.5 });
    tone(150, { type: 'sawtooth', dur: 0.7, to: 40, gain: 0.16 });
    notes([84, 79], { type: 'square', step: 0.08, dur: 0.1, gain: 0.07, at: 0.05 });
  },
  shoot(kind: string) {
    if (kind === 'arrow') {
      tone(midiHz(76), { type: 'triangle', dur: 0.09, to: midiHz(64), gain: 0.14 });
      noise({ filter: 'highpass', hz: 3000, dur: 0.05, gain: 0.12 });
    } else if (kind === 'sword') noise({ filter: 'bandpass', hz: 1200, toHz: 500, q: 2, dur: 0.3, gain: 0.2 });
    else if (kind === 'orb') tone(midiHz(69), { type: 'sine', dur: 0.35, to: midiHz(81), gain: 0.16 });
    else if (kind === 'boulder') tone(110, { type: 'square', dur: 0.15, to: 70, gain: 0.12 });
    else if (kind === 'toss') noise({ filter: 'bandpass', hz: 700, toHz: 1600, q: 2, dur: 0.35, gain: 0.18 });
    else noise({ filter: 'lowpass', hz: 400, dur: 0.25, gain: 0.3 });
  },
  reflect() {
    notes([88, 95], { type: 'square', step: 0.04, dur: 0.08, gain: 0.08 });
  },
  armor() {
    tone(midiHz(57), { type: 'square', dur: 0.12, gain: 0.1 });
    tone(midiHz(64), { type: 'square', dur: 0.12, gain: 0.08 });
  },
  shatter() {
    for (let i = 0; i < 4; i++) noise({ filter: 'bandpass', hz: 800 + i * 400, at: i * 0.03, dur: 0.08, gain: 0.2 });
  },
  /** Grabbing a ledge. */
  ledge() {
    noise({ filter: 'bandpass', hz: 1400, q: 2, dur: 0.05, gain: 0.25 });
    tone(midiHz(67), { type: 'triangle', dur: 0.06, gain: 0.08 });
  },
  teleport() {
    tone(midiHz(84), { type: 'sine', dur: 0.2, to: midiHz(96), gain: 0.1 });
  },
  /** Two attacks meeting: a metallic clank. */
  clash() {
    tone(midiHz(86), { type: 'square', dur: 0.08, gain: 0.07 });
    tone(midiHz(91), { type: 'square', dur: 0.1, gain: 0.05, at: 0.01 });
    noise({ filter: 'highpass', hz: 4000, dur: 0.06, gain: 0.18 });
  },
  /** A command grab catching. */
  grab() {
    noise({ filter: 'lowpass', hz: 900, dur: 0.07, gain: 0.25 });
    tone(140, { type: 'square', dur: 0.08, to: 90, gain: 0.1 });
  },
  count(n: number) {
    tone(midiHz(n > 0 ? 72 : 84), { type: 'square', dur: n > 0 ? 0.12 : 0.35, gain: 0.12 });
  },
  game() {
    notes([72, 76, 79, 84], { type: 'square', step: 0.06, dur: 0.2, gain: 0.1 });
    noise({ filter: 'lowpass', hz: 1200, dur: 0.5, gain: 0.25 });
  },
  sudden() {
    notes([60, 63, 66, 69], { type: 'sawtooth', step: 0.1, dur: 0.18, gain: 0.07 });
  },
};
