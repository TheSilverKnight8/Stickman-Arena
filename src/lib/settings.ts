import { createStore, useStore } from './store';

// Quality-of-life settings. The spec says nothing is saved, so these last until
// the app is closed and start from the defaults next time.

export interface Settings {
  /** 0.5 (dim) to 1 (full). Darkens the whole screen. */
  brightness: number;
  /** 0 to 1. */
  musicVolume: number;
  /** 0 to 1. */
  effectsVolume: number;
  /** Platfighter: pushing up also jumps. */
  tapJump: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  brightness: 1,
  musicVolume: 0.5,
  effectsVolume: 0.8,
  tapJump: false,
};

export const settings = createStore<Settings>({ ...DEFAULT_SETTINGS });

export function useSettings() {
  return useStore(settings);
}

export function updateSettings(patch: Partial<Settings>) {
  settings.set((s) => ({ ...s, ...patch }));
}
