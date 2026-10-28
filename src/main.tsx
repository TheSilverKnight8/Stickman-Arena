import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/archivo';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import App from './App';
import { attachAudio } from './lib/audio/engine';

// Installs the service worker. New versions activate on the next app launch.
if (!import.meta.env.DEV) registerSW({ immediate: true });

attachAudio();

// Development only: lets automated tests look inside the running app.
if (import.meta.env.DEV) {
  void Promise.all([
    import('./pazaak/rules'),
    import('./pazaak/cards'),
    import('./pazaak/cpu'),
    import('./pazaak/session'),
    import('./lib/rng'),
    import('./lib/audio/engine'),
    import('./lib/audio/music'),
    import('./lib/audio/sfx'),
  ]).then(([rules, cards, cpu, session, rng, engine, music, sfx]) => {
    (window as unknown as Record<string, unknown>).__arena = { rules, cards, cpu, session, rng, audio: { ...engine, ...music, ...sfx } };
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
