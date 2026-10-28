# Stickman-Arena
A fun platfighter for 2-4 players, plus Pazaak

**Stickman Arena** is two games in one app: a stick-figure **Platfighter** and **Pazaak**, the card game from KOTOR II. Play a friend online with a room code, or play the CPU.

It is an installable web app (PWA) for phones and computers, hosted on GitHub Pages. There are no accounts and nothing is saved.

## What is in it

| Area | What it does |
| --- | --- |
| Home | Two buttons, one per game. Each leads to that game's home page: create a room, join one with a code, play the CPU, settings. |
| Pazaak | KOTOR II rules as written in [`docs/pazaak.md`](docs/pazaak.md). Build a 10-card side deck (or Random), 20-second turns, automatic stand at 20, first to 3 sets. CPU at Normal (plain cards) or Advanced (adds ± cards and the tiebreaker). Portrait and landscape on phones. |
| Online rooms | The creator gets a 5-character code to share (shown large, with a copy button). The other player types it in. Game data goes directly between the two devices (WebRTC); the free PeerJS server only introduces them. If a player leaves or loses connection mid-match, the match is a draw. |
| Platfighter | Smash-style: damage builds up, KOs off the blast zones, 3 stocks, 3 minutes, sudden death at 300%. Five fighters with 12 moves each ([`docs/characters.md`](docs/characters.md)), five stages, CPU at Easy, Normal and Hard. Ledges, and an optional tap jump. Keyboard on computers, joystick and four buttons on phones (landscape). Online rooms for 2 players with rollback netcode: character select, stage vote, match, then back to character select. |
| Settings | Brightness, music volume, effects volume; tap jump for the Platfighter. Kept until the app closes. |
| Sound | Music and effects made in the browser; no audio files. |

The rules and the choices left to the builder are written down in [`SPEC.md`](SPEC.md) (Caleb's spec), [`docs/pazaak.md`](docs/pazaak.md) and [`docs/decisions.md`](docs/decisions.md).

## Run it on your computer

Needs Node.js 20.19 or newer.

```bash
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173).

### Testing rooms on one computer

Rooms normally use the free PeerJS cloud server. To test without it, run a local copy of the server and point the app at it:

```bash
npm run peer                                   # signaling server on 127.0.0.1:9000
VITE_PEER_HOST=127.0.0.1 VITE_PEER_PORT=9000 npm run dev
```

Then open the app in two browser windows: create a room in one and join it from the other.

## Put it online (GitHub Pages)

1. Push this project to a **public** GitHub repository (Pages is free for public repositories).
2. **Settings > Pages > Build and deployment > Source**: choose **GitHub Actions**.
3. Push to `main`. [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and publishes the app to `https://<your-username>.github.io/<repo-name>/`.

To install it:
- **iPhone / iPad (Safari):** Share > Add to Home Screen.
- **Android (Chrome)** and **computers (Chrome / Edge):** the browser offers Install.

CPU games work offline once the app has been opened. Online rooms need an internet connection.

## Project layout

```
src/
  pazaak/        cards and pool, rules, CPU, match timer, online session
  pazaak/ui/     table, cards, deck builder, Pazaak screens
  fighter/sim/   Platfighter simulation: skeletons, physics, hits, stages, match rules (deterministic)
  fighter/sim/chars/  the five fighters and their moves
  fighter/render/     drawing the match
  fighter/input/      keyboard and touch controls, tap jump
  fighter/ui/         character select, match screen, online room
  fighter/ai.ts       the CPU
  fighter/online.ts   online room: lobby, stage vote, rollback match
  net/           rooms (codes, PeerJS connection, heartbeat) and rollback netcode
  lib/audio/     sound engine, effects, music
  lib/           settings, seeded random numbers, small shared store
  pages/         Home, game home pages, Settings
  components/    page frames, buttons, dialogs
  graphics/      app icon, Home illustrations, Croswell Industries logo
docs/            Pazaak rules, the fighters' moves, builder's decisions
```

Built with React, TypeScript, Vite, Tailwind CSS, vite-plugin-pwa and PeerJS. Headings use Norwester by Jamie Wilson (SIL Open Font License, `src/assets/fonts/`).
