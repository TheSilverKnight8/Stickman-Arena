import { settings } from '../settings';

// One AudioContext for the whole app, with separate volume for music and effects.
// Browsers only allow sound after the player has tapped or pressed a key, so the
// context starts on the first such input.

interface Audio {
  ctx: AudioContext;
  music: GainNode;
  effects: GainNode;
  noise: AudioBuffer;
}

let audio: Audio | null = null;
const startListeners = new Set<() => void>();

export function getAudio(): Audio | null {
  return audio && audio.ctx.state === 'running' ? audio : null;
}

/** Runs `fn` once sound is available (right away if it already is). */
export function whenAudioStarts(fn: () => void) {
  if (getAudio()) fn();
  else startListeners.add(fn);
}

/** Perceived loudness is closer to the square of the slider value. */
const curve = (v: number) => v * v;

function applyVolumes() {
  if (!audio) return;
  const { musicVolume, effectsVolume } = settings.get();
  const t = audio.ctx.currentTime;
  audio.music.gain.setTargetAtTime(curve(musicVolume) * 0.55, t, 0.05);
  audio.effects.gain.setTargetAtTime(curve(effectsVolume) * 0.9, t, 0.02);
}

function create(): Audio {
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  // A gentle ceiling so stacked sounds never clip harshly.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 6;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  limiter.connect(ctx.destination);
  const music = ctx.createGain();
  const effects = ctx.createGain();
  music.connect(limiter);
  effects.connect(limiter);
  // One second of white noise, reused by every noise-based sound.
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return { ctx, music, effects, noise };
}

function unlock() {
  try {
    if (!audio) {
      audio = create();
      applyVolumes();
      settings.subscribe(applyVolumes);
    }
    if (audio.ctx.state !== 'running') void audio.ctx.resume().then(started);
    else started();
  } catch {
    // No Web Audio: the app works silently.
  }
}

function started() {
  if (!audio || audio.ctx.state !== 'running') return;
  const fns = [...startListeners];
  startListeners.clear();
  fns.forEach((fn) => fn());
}

/** Call once at startup. */
export function attachAudio() {
  const opts = { capture: true, passive: true } as const;
  for (const type of ['pointerdown', 'keydown', 'touchend'] as const) window.addEventListener(type, unlock, opts);
  // Pause everything while the app is in the background.
  document.addEventListener('visibilitychange', () => {
    if (!audio) return;
    if (document.hidden) void audio.ctx.suspend();
    else void audio.ctx.resume();
  });
}
