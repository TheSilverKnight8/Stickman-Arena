# Decisions made by Claude Code

The spec leaves these items to Claude Code (**Claude Code decides**). Each is written down here so Caleb can read it, playtest it and change it. Anything about *what* the app does that is not here or in `SPEC.md` was asked first.

## Build stages (agreed with Caleb)

1. Skeleton and Pazaak: Home, both game home pages, settings, PWA and deploy, Pazaak with CPU and online play. **(this stage)**
2. Platfighter against the CPU: engine, 5 characters, 5 stages, keyboard and touch controls.
3. Platfighter online, 2 players, with rollback netcode.
4. 3–4 players online, only after Caleb says 2-player works well.

## Rooms and networking (both games)

| Item | Choice | Why |
| --- | --- | --- |
| Room code | 5 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O or 1/I), about 33 million codes. Typing it in lowercase, or with spaces or a dash, still works. | Short enough to read out loud; no look-alike characters. |
| Sharing the code | Both: the code is shown large on the room screen, and the creator has a **Copy code** button. | |
| Signaling | The free PeerJS cloud server (PeerJS 1.5.5). The creator's browser registers a name made from the code; the other player connects to that name. | No account, no server to run, no database. |
| Game data | Directly between the two browsers over WebRTC, never through a server. | Free-plan message limits do not apply. |
| Connection help | PeerJS's built-in settings: Google's STUN server and PeerJS's public TURN relay (for networks that block direct connections). | Free. Best effort: neither is guaranteed. |
| Leaving / dropping | Each side sends a small "still here" message every second. Six seconds of silence, a closed connection, or a failed connection counts as gone. Mid-match that is a draw, as the spec says. | Phones that lock or switch apps stop answering, so silence has to count. |
| Room size | Pazaak: 2. A third player trying the code is told the room already has its players. | |
| After someone leaves | If the other player leaves, the room stays open for its creator with the same code, so a new player can join. If the creator leaves, the room closes and the other player is sent back with a notice. | |

Not used, and why:
- **NetplayJS:** last change Oct 2024, last release Apr 2023.
- **rollback-netcode (npm):** version 0.0.6, "APIs may change". The fighter's rollback netcode will be written in this repo (Stage 3), on top of the same PeerJS rooms.
- **Supabase Realtime:** the spec's own finding is that per-frame play exceeds the free plan, and the spec says no database.
- **Cloudflare TURN:** its free allowance looked to be tied to their SFU product, and it needs a server to hand out credentials.

**Free-plan check:** the PeerJS cloud server publishes no limit and no uptime promise. For two friends playing it is very unlikely to matter, but if it is ever down, rooms cannot be created (CPU games still work). The fallback would be running our own copy of the signaling server; ask before doing that.

## Pazaak

The rules themselves are Caleb's (`docs/pazaak.md`). Choices about how it plays:

| Item | Choice |
| --- | --- |
| Who runs an online match | The room creator's device runs the rules and the timer; the other device sends its moves. Each device is only sent what its player may see: the opponent's hand is face down and the deck order is hidden. |
| Timer | 5 seconds per turn, in online and CPU games. It starts when the card is drawn and does not restart when a hand card is played. A bar and a number show it to both players, with ticks in the last 3 seconds of your turn. |
| ± cards | Tapping one opens a + / − choice above it. |
| Between sets | The result shows for about 2.6 seconds, then the next set starts by itself. |
| End of match | Online: the result shows for 5 seconds, then both players go back to deck selection (the rematch). CPU: the result stays until you press **Back to deck selection**. |
| Deck between matches | Kept while the app is open (CPU and rooms share it), never saved. |
| CPU decks | Normal: 10 random plain cards (+1 to +6, −1 to −6), up to 2 of each. Advanced: the tiebreaker plus 9 random cards from the whole pool. A new deck each match. |
| CPU play (both levels) | Draws, then: saves itself with a minus card when over 20; plays a ninth card when that wins; spends a hand card only to land on 19 or 20 (hand cards last the whole match); stands at 18 or more, or at 17 if the opponent is lower; against a standing opponent, keeps drawing until it is ahead, using a card or the tiebreaker to get there when it can. It waits about a second per move so you can follow it. |
| Table layout | Portrait: opponent on top (smaller), you below, your hand and buttons at the bottom. Landscape: you on the left, the opponent on the right, your hand in the middle. |
| Card faces | Main deck: cream with a navy number. + cards navy, − cards red, ± cards split navy and red, the tiebreaker split with a T badge. A ± card on the table shows the sign it was played as, with a small ±. |

## Settings

Shown on each game's Settings page, shared by both games:

- **Brightness**, 50–100%: darkens the whole screen.
- **Music volume** and **Effects volume**.
- **Back to defaults.**

They are kept in memory only, because the spec says nothing is saved. They go back to the defaults when the app closes. *(Asked Caleb whether settings count as "saving".)*

## Audio

- All sound is made in the browser with the Web Audio API. There are no audio files, so it adds nothing to the site's size or bandwidth.
- Music: a bright menu theme (C major) on the menus, and a laid-back cantina swing (A minor) at the Pazaak table. The fighter gets its own track in Stage 2.
- Effects: menu clicks, card draw, card play, stand, bust, shuffle, set won / lost / tied, match won / lost / drawn, timer ticks, player joined, refused action.
- Sound starts after the first tap or key press (a browser rule), and pauses while the app is in the background.

## Look

- The portal's and Synth Studio's style: cream, navy and red; Norwester headings; Archivo body text; staggered stripes; flat cards. Light mode only.
- Game feel: chunky buttons that sit on a navy block and press down into it, card deal and pop animations, stick-figure illustrations on Home.
- App icon: a cream stick figure mid-kick with a red impact star, on navy.
- Logo: full Croswell Industries logo on Home; the C mark in the gap left of the bottom stripes everywhere else, including the slim stripe under the Pazaak table.
