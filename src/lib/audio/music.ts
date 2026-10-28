import { getAudio, whenAudioStarts } from './engine';

// Background music: short looping tunes played by a small step sequencer.
// Notes are MIDI numbers, one per eighth note; 0 is a rest.

export type TrackId = 'menu' | 'pazaak' | 'fighter';

interface Track {
  bpm: number;
  /** 0 = straight eighths, up to ~0.33 for a swing feel. */
  swing: number;
  lead: number[];
  bass: number[];
  /** Short chord stabs: one chord (or null) per eighth note. */
  chords: (number[] | null)[];
  /** Drum pattern: k = kick, s = snare, h = hat, . = rest. One character per eighth note. */
  drums: string;
  leadType: OscillatorType;
}

const bar = (...n: number[]) => n;
const rep = <T,>(a: T[], times: number) => Array.from({ length: times }, () => a).flat();

// "Menu": bright and bouncy, C major (C, G, Am, F).
const menuBass = [36, 43, 45, 41].flatMap((r) => bar(r, 0, r + 12, 0, r, r, r + 12, 0));
const menu: Track = {
  bpm: 128,
  swing: 0,
  leadType: 'square',
  lead: [
    ...bar(72, 0, 67, 72, 76, 0, 74, 72),
    ...bar(71, 0, 67, 71, 74, 0, 72, 71),
    ...bar(72, 0, 69, 72, 76, 0, 79, 76),
    ...bar(77, 76, 74, 72, 74, 0, 0, 0),
    ...bar(72, 0, 67, 72, 76, 0, 74, 72),
    ...bar(74, 0, 71, 74, 79, 0, 77, 76),
    ...bar(76, 74, 72, 69, 72, 74, 76, 0),
    ...bar(77, 0, 76, 0, 74, 0, 71, 0),
  ],
  bass: [...menuBass, ...menuBass.slice(0, 24), ...bar(41, 0, 53, 0, 43, 0, 55, 0)],
  chords: rep([null, null, null, null, null, null, null, null], 8),
  drums: rep(['khshkhsh'], 8).join(''),
};

// "Pazaak": a laid-back cantina swing in A minor (Am, Dm, E7).
const am = [57, 60, 64];
const dm = [57, 62, 65];
const e7 = [56, 59, 62];
const stabs = (c: number[]) => [null, c, null, c, null, c, null, c];
const pazaak: Track = {
  bpm: 112,
  swing: 0.28,
  leadType: 'triangle',
  lead: [
    ...bar(69, 72, 76, 0, 75, 76, 72, 69),
    ...bar(74, 0, 77, 0, 76, 74, 72, 0),
    ...bar(71, 0, 68, 71, 74, 0, 72, 71),
    ...bar(69, 0, 64, 0, 69, 0, 0, 0),
    ...bar(69, 72, 76, 0, 75, 76, 79, 76),
    ...bar(77, 0, 74, 0, 77, 79, 81, 0),
    ...bar(80, 0, 76, 0, 74, 71, 68, 71),
    ...bar(69, 0, 0, 0, 64, 0, 69, 0),
  ],
  bass: [
    ...bar(45, 0, 40, 0, 45, 0, 40, 0),
    ...bar(38, 0, 45, 0, 38, 0, 45, 0),
    ...bar(40, 0, 47, 0, 40, 0, 47, 0),
    ...bar(45, 0, 40, 0, 45, 0, 44, 0),
    ...bar(45, 0, 40, 0, 45, 0, 40, 0),
    ...bar(38, 0, 45, 0, 38, 0, 45, 0),
    ...bar(40, 0, 47, 0, 40, 0, 47, 0),
    ...bar(45, 0, 40, 0, 45, 0, 45, 0),
  ],
  chords: [am, dm, e7, am, am, dm, e7, am].flatMap(stabs),
  drums: rep(['k.s.k.sh'], 8).join(''),
};

// "Fighter": driving and fast, D minor (Dm, Bb, C, A).
const fightBass = [38, 34, 36, 33].flatMap((r) => bar(r, r + 12, r, r + 12, r, r + 12, r + 7, r + 12));
const fighter: Track = {
  bpm: 150,
  swing: 0,
  leadType: 'square',
  lead: [
    ...bar(74, 0, 74, 77, 0, 76, 74, 72),
    ...bar(70, 0, 70, 74, 0, 72, 70, 69),
    ...bar(72, 0, 72, 76, 0, 74, 72, 70),
    ...bar(69, 0, 73, 0, 76, 0, 79, 0),
    ...bar(74, 77, 81, 0, 79, 77, 76, 74),
    ...bar(77, 0, 74, 0, 70, 0, 74, 77),
    ...bar(76, 0, 72, 0, 79, 0, 76, 72),
    ...bar(73, 0, 76, 0, 81, 0, 0, 0),
  ],
  bass: [...fightBass, ...fightBass],
  chords: rep([null, null, null, null, null, null, null, null], 8),
  drums: rep(['khskkhsh'], 8).join(''),
};

const TRACKS: Record<TrackId, Track> = { menu, pazaak, fighter };

const midiHz = (m: number) => 440 * 2 ** ((m - 69) / 12);
const LOOKAHEAD = 0.2;

let current: { id: TrackId; out: GainNode; step: number; next: number; timer: number } | null = null;
let wanted: TrackId | null = null;

/** Plays a track (keeps playing if it is already on). null stops the music. */
export function playMusic(id: TrackId | null) {
  wanted = id;
  if (current?.id === id) return;
  stop();
  if (id) whenAudioStarts(() => wanted === id && !current && start(id));
}

function stop() {
  if (!current) return;
  const a = getAudio();
  const c = current;
  current = null;
  window.clearInterval(c.timer);
  if (a) {
    c.out.gain.setTargetAtTime(0, a.ctx.currentTime, 0.12);
    window.setTimeout(() => c.out.disconnect(), 800);
  } else c.out.disconnect();
}

function start(id: TrackId) {
  const a = getAudio();
  if (!a) return;
  const out = a.ctx.createGain();
  out.gain.value = 0;
  out.gain.setTargetAtTime(1, a.ctx.currentTime, 0.2);
  out.connect(a.music);
  current = { id, out, step: 0, next: a.ctx.currentTime + 0.1, timer: 0 };
  const c = current;
  c.timer = window.setInterval(() => schedule(c), 50);
  schedule(c);
}

function schedule(c: NonNullable<typeof current>) {
  const a = getAudio();
  if (!a || current !== c) return;
  const t = TRACKS[c.id];
  const eighth = 60 / t.bpm / 2;
  // After a long pause (app in the background), pick up from now instead of catching up.
  if (c.next < a.ctx.currentTime - 0.25) c.next = a.ctx.currentTime + 0.05;
  while (c.next < a.ctx.currentTime + LOOKAHEAD) {
    const i = c.step % t.lead.length;
    const swingDelay = c.step % 2 === 1 ? t.swing * eighth : 0;
    const at = c.next + swingDelay;
    const len = eighth * 0.9;
    if (t.lead[i]) voice(a.ctx, c.out, t.leadType, midiHz(t.lead[i]), at, len, 0.07, 3200);
    const b = t.bass[i % t.bass.length];
    if (b) voice(a.ctx, c.out, 'triangle', midiHz(b), at, len * 0.95, 0.2, 900);
    const chord = t.chords[i % t.chords.length];
    if (chord) chord.forEach((m) => voice(a.ctx, c.out, 'square', midiHz(m), at, eighth * 0.35, 0.022, 1800));
    drum(a, c.out, t.drums[i % t.drums.length], at);
    c.step++;
    c.next += eighth;
  }
}

function voice(ctx: AudioContext, out: AudioNode, type: OscillatorType, hz: number, at: number, len: number, gain: number, cutoff: number) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = hz;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = cutoff;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.008);
  g.gain.setTargetAtTime(gain * 0.6, at + 0.02, 0.08);
  g.gain.setTargetAtTime(0, at + len, 0.02);
  osc.connect(f).connect(g).connect(out);
  osc.start(at);
  osc.stop(at + len + 0.15);
}

function drum(a: NonNullable<ReturnType<typeof getAudio>>, out: AudioNode, kind: string, at: number) {
  const { ctx } = a;
  if (kind === 'k') {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(140, at);
    osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(0.35, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(g).connect(out);
    osc.start(at);
    osc.stop(at + 0.2);
    return;
  }
  if (kind !== 's' && kind !== 'h') return;
  const src = ctx.createBufferSource();
  src.buffer = a.noise;
  const f = ctx.createBiquadFilter();
  f.type = kind === 's' ? 'bandpass' : 'highpass';
  f.frequency.value = kind === 's' ? 1800 : 7000;
  const g = ctx.createGain();
  const dur = kind === 's' ? 0.12 : 0.03;
  g.gain.setValueAtTime(kind === 's' ? 0.16 : 0.05, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at, Math.random() * 0.5);
  src.stop(at + dur + 0.02);
}
