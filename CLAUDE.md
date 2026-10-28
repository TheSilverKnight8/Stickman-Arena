# Notes for Claude Code

`SPEC.md` is Caleb's. It holds what the app does. Follow it and do not add features that are not in it.

- The ideas are Caleb's; the design and implementation are the builder's. When a question is about *what* the app should do and `SPEC.md` (or `docs/pazaak.md`) does not answer it, ask Caleb before building it. Items the spec marks **Claude Code decides** are recorded in `docs/decisions.md`; Caleb playtests and adjusts them.
- This project is independent of Caleb's other projects. The only links are the workflow and the visual style of the Engineering Management Portal and Synth Studio (cream, navy and red, Norwester headings, staggered stripes). Not the old shop manual. Light mode only.
- Logo rule (same as the portal and Synth Studio): the full Croswell Industries logo on Home only; the C mark on every other screen, in the gap left of the bottom stripes.
- Free plans only. No accounts, no database, no saving of any kind (settings and decks last until the app closes). Hosting is GitHub Pages; rooms use the free PeerJS signaling server and direct WebRTC connections.
- Pazaak rules are in `docs/pazaak.md`, in Caleb's words. `src/pazaak/rules.ts` must match them.
- Each fighter's 12 moves are documented in `docs/characters.md`, which is generated from `src/fighter/sim/chars/`. When moves change, update it too.
- Platfighter netcode is rollback (`src/net/rollback.ts`, rooms in `src/fighter/online.ts`): the match state must be a plain, copyable object, the simulation runs on a fixed timestep, and it must give identical results on every device. No `Math.random`, `Math.sin`/`cos`/`atan2`/`pow` or other engine-dependent math inside the simulation; use `src/lib/rng.ts` and precomputed values.
- A player leaving or losing connection mid-match ends it in a draw, in both games.
- `npm run typecheck` and `npm run build` must pass.
