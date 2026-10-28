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
};
