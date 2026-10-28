import { useSyncExternalStore } from 'react';

const query = '(orientation: landscape)';

function subscribe(fn: () => void) {
  const m = window.matchMedia(query);
  m.addEventListener('change', fn);
  return () => m.removeEventListener('change', fn);
}

/** True when the screen is wider than it is tall. */
export function useLandscape() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}
