# Decisions made by Claude Code

The spec leaves these items to Claude Code (**Claude Code decides**). Each is written down here so Caleb can read it, playtest it and change it. Anything about *what* the app does that is not here or in `SPEC.md` was asked first.

## Build stages (agreed with Caleb)

1. Skeleton and Pazaak: Home, both game home pages, settings, PWA and deploy, Pazaak with CPU and online play. **(done)**
2. Platfighter against the CPU: engine, 5 characters, 5 stages, keyboard and touch controls. Plus Caleb's two Pazaak changes (20-second turns, automatic stand at 20). **(this stage)**
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
| Timer | 20 seconds per turn (Caleb's change after Stage 1; it was 5), in online and CPU games. It starts when the card is drawn and does not restart when a hand card is played. A bar and a number show it to both players, with ticks in the last 3 seconds of your turn. |
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

## Platfighter

The 12 moves of each fighter, with their numbers, are in [`characters.md`](characters.md). Everything below is a first pass for playtesting.

### Caleb's answers used here

| Question | Answer |
| --- | --- |
| CPU match: who picks the CPU's fighter and the stage? | Both random. |
| Character select | Has a Random option. |
| Sudden death time limit | After 1 minute it ends in a draw. |

### How a match runs

| Item | Choice |
| --- | --- |
| Simulation | 60 steps per second, fixed, whatever the screen's refresh rate. The whole match is one plain object that can be copied, and only exact arithmetic is used (angles go through a fixed polynomial instead of `Math.sin`), so the same inputs give the same match on any device. That is what Stage 3's rollback netcode needs. Tested: identical inputs give identical matches, and a rewound match replays identically. |
| Size | A standing fighter is about 100 units tall. The main stage is 760 wide; the blast zones are 770 beyond each edge, 1000 above and 600 below. |
| Knockback | The Smash formula: knockback grows with the victim's damage after the hit, the move's damage, and its knockback growth, and shrinks with weight. Launch speed falls off steadily. Hitstun is 0.4 frames per point of knockback. |
| Hitlag | Both fighters freeze briefly on a hit (4 to 18 frames, by damage). Multi-hit moves freeze for 2 frames per hit. |
| Hitboxes and hurtboxes | Hurtboxes come from the stick figure's own limbs, head and torso, so they follow every animation (this is how Phantom's hurtbox shifts). Spartan's sword is not a hurtbox (a disjoint). A hitbox on a fist or foot covers the forearm or shin too, so point-blank hits connect. |
| Rough KO percents | Against a mid-weight fighter in the middle of the stage: Spartan's Grand Slash about 80%, Buster's Hammer Fist about 100%, Fisticuffs' Haymaker about 100%, Ranger's fully charged shot about 110%, Phantom's best moves about 210%. Edge KOs come earlier. |
| Respawn | After a KO: 1 second off screen, then a platform above the stage for up to 2.5 seconds (any button drops), then 2 seconds where the fighter cannot be hit (blinking). |
| End of match | Last fighter with stocks wins. At 3:00, most stocks wins. A tie goes to sudden death: 1 stock each at 300%, with a new countdown; after 1 minute it is a draw. If both fighters lose their last stock on the same frame, that is also a sudden death (or a draw, if it happens in sudden death). |
| Leaving a CPU match | Ends it (Leave button, or Escape), back to character select. |

### Movement and defense

| Item | Choice |
| --- | --- |
| Double jump | One per jump, back on landing. |
| Short hop | Let go of jump during the crouch before the jump for a lower jump. |
| Fast fall | Tap down in the air while falling. |
| Platforms | Pass through from below; hold down for 3 frames to drop through. |
| Spot dodge (ground) | 24 frames; cannot be hit on frames 3–17. No limit. |
| Spot dodge (air) | 30 frames; cannot be hit on frames 3–20; keeps falling, no steering. Once per jump, back on landing. |
| Up special | Once in the air, back on landing (spec). There is no helpless state afterward. |
| Ledges (Caleb's request after Stage 2) | The two top corners of the main stage are ledges (platforms have none). A fighter grabs one automatically when falling (or rising during an up special) with the corner within reach of the hands, unless holding down or still launched. One fighter per ledge. Grabbing gives back the double jump, up special and air dodge. |
| Ledge invincibility | A grab after landing or being hit can't be hit for 24 frames. A regrab without landing in between gets none, so hanging can't be repeated forever for safety. |
| On the ledge | After 6 frames: toward the stage or up climbs (22 frames; can't be hit for the first 14), jump jumps up from the ledge, away or down lets go. A direction already held when grabbing doesn't count until it is let go and pressed again, so holding toward the stage while recovering doesn't climb by itself. Dodge also climbs. Attack and special do nothing (a ledge attack would be a 13th move). After 5 seconds hanging, the fighter lets go. |
| Regrab | After leaving a ledge, it can't be grabbed again for 30 frames. |
| Stage edge collision (fixes the back-and-forth clipping Caleb saw) | Landing on the stage needs the fighter's centre over the stage. The sides push the body out by how far its feet are below the top, so stepping off the edge slides off smoothly. Before, the collision box could land a fighter whose centre was already past the edge; the next frame found no ground under it, and it flickered between standing and falling. The old "step-up" onto the stage is gone; ledges replace it. |
| Input buffer | A button pressed up to 6 frames before the fighter can act still counts. |
| Tap jump (Caleb's request after Stage 2) | A setting on the Platfighter's Settings page, **off by default** so the controls stay as they were. When on, pressing up also jumps. The jump waits 3 frames after up is pressed: Attack or Special in that window gives the up attack or up special instead. Holding up holds the jump (full jump); a quick tap is a short hop; pressing up again in the air double jumps. It is applied on the player's own device before the buttons are used or sent online, so each player has their own setting and online matches stay in sync. Kept until the app closes, like the other settings. |

### Armor, reflect and projectiles

| Item | Choice |
| --- | --- |
| Armor | Buster only, on 4 moves: Hammer Fist (wind-up), Charging Tackle, Rocket Leap (crouch), Ground Pound (the whole fall). A hit with knockback under 100 does its damage but does not launch or interrupt. Harder hits (or any hit once Buster's damage is high) break through. A yellow glow shows when armor is on. |
| Reflect | Spartan's Deflect. Sends arrows, orbs and boulders back 15% faster and 25% stronger, now owned by Spartan. The thrown sword and shockwaves are not reflected. |
| Ranger | Up to 5 arrows at once; a shot past the limit does not fire. Arrows fall slightly, stop at the stage, and keep flying if Ranger is hit. Charged Shot: speed up to +60%, damage up to +8, more knockback. |
| Spartan | One sword. It flies out, turns around and returns; it can hit on the way out and again on the way back. While it is out, moves that need the sword do not start. If Spartan is KO'd, the sword is back in hand on respawn. |
| Buster | One boulder at a time (Boulder Lob waits until the last one is gone). Ground Pound's shockwaves are separate and not limited. |
| Phantom | One orb at a time. The orb fades if Phantom is hit. |

### Weight, speed and jump

Ratings from the archetypes (1 = lowest of the five, 5 = highest, worked out from the numbers):

| Fighter | Weight | Run speed | Jump height |
| --- | --- | --- | --- |
| Fisticuffs | 85 (light) | 7.2 (fast) | good |
| Spartan | 108 (heavy-ish) | 5.0 (slow) | low |
| Ranger | 98 (average) | 6.0 (average) | average |
| Buster | 130 (heaviest) | 4.4 (slowest) | lowest, falls fastest |
| Phantom | 78 (lightest) | 8.0 (fastest) | highest |

Recovery distance, measured by script, follows the same order: Phantom, then Ranger, Fisticuffs, Spartan, Buster.

### Stages

All share the same base: a solid slab 760 wide. Pass-through platforms:

| Stage | Platforms |
| --- | --- |
| Flatline | None (the flat base only). |
| Lookout | 1 over the middle. |
| Twin Decks | 2 side by side. |
| Scaffold | 2 low, 1 high in the middle. |
| Rafters | 4: two low at the edges, two higher inside. |

### Controls

| Device | Layout |
| --- | --- |
| Keyboard | WASD or the arrow keys move and aim. With WASD: J attack, K special, L or Space jump, ; or Shift dodge. With the arrows: Z attack, X special, C or Space jump, V dodge. Both work at the same time. Escape asks to leave the match. |
| Phone | Landscape. A joystick on the left half (it appears where the thumb touches); Attack, Special, Jump and Dodge on the right. The stick counts as up or down only when pushed mostly up or down, so a slightly diagonal push still gives a side attack. Turning the phone upright pauses a CPU match with a message. |
| Directions | Up or down held → up or down move; otherwise left or right → side move (the fighter turns to face that way); nothing → neutral. |

### CPU

The CPU presses the same buttons a player does.

| Level | Behaviour |
| --- | --- |
| Easy | Decides about 4 times a second, attacks about a third of the time when in range, wanders sometimes, never dodges, and misses its recovery about half the time. |
| Normal | Decides about 8 times a second, attacks most of the time in range, recovers, dodges an incoming attack about 1 time in 8. |
| Hard | Decides 20 times a second, aims where you will be when the move comes out, dodges about 1 time in 3, prefers KO moves when you are above 100%, recovers reliably. |

Each fighter keeps its own distance: Ranger stays far and shoots, Spartan stays at sword range, Fisticuffs gets close, Phantom hits and backs off. Measured over 30 matches each: Hard beats Easy 28–2 and Normal 22–8; Normal beats Easy 26–4.

### Look and sound

- Stick figures with a navy outline under each colour (so yellow reads on cream), a ring for the head like the app icon, and one prop each: Fisticuffs' gloves and headband, Spartan's sword and helmet crest, Ranger's bow, Buster's big fists, Phantom's red scarf.
- A second copy of the same fighter uses a lighter or darker shade (red → salmon, blue → sky blue, green → lime, gold → bronze, purple → pink-violet).
- The camera follows both fighters and zooms between a close and a wide limit. A bubble at the screen edge shows a fighter who is off camera, with their damage.
- HUD: the clock at the top; a card per player at the bottom with damage (turning red past 75%) and stocks.
- Effects: hit sparks (bigger and with screen shake for strong hits), staggered-stripe bursts for KOs, landing dust, boulder rubble, reflect and armor rings.
- A fast fight track (D minor) during matches. Effects for hits by strength, swings, jumps, landing, dodges, each projectile, reflect, armor, KOs, the countdown and "GAME!".
