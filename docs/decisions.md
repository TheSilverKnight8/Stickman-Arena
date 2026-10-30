# Decisions made by Claude Code

The spec leaves these items to Claude Code (**Claude Code decides**). Each is written down here so Caleb can read it, playtest it and change it. Anything about *what* the app does that is not here or in `SPEC.md` was asked first.

## Build stages (agreed with Caleb)

1. Skeleton and Pazaak: Home, both game home pages, settings, PWA and deploy, Pazaak with CPU and online play. **(done)**
2. Platfighter against the CPU: engine, 5 characters, 5 stages, keyboard and touch controls. Plus Caleb's two Pazaak changes (20-second turns, automatic stand at 20). **(done)**
3. Platfighter online, 2 players, with rollback netcode. Plus Caleb's requests after Stage 2: ledges, the edge clipping fix, and a tap jump setting. **(this stage)**
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
| Room size | Pazaak: 2. Platfighter: 2 (3–4 is Stage 4). A third player trying the code is told the room already has its players. | |
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
| CPU match: who picks the CPU's fighter and the stage? | Both random. Since the modes update (Caleb's friend's idea) they can be picked; Random is still there, and is the default. |
| Character select | Has a Random option. |
| Sudden death time limit | After 1 minute it ends in a draw. |

### How a match runs

| Item | Choice |
| --- | --- |
| Simulation | 60 steps per second, fixed, whatever the screen's refresh rate. The whole match is one plain object that can be copied, and only exact arithmetic is used (angles go through a fixed polynomial instead of `Math.sin`), so the same inputs give the same match on any device. That is what Stage 3's rollback netcode needs. Tested: identical inputs give identical matches, and a rewound match replays identically. |
| Size | A standing fighter is about 100 units tall. The main stage is 760 wide; the blast zones are 770 beyond each edge, 1000 above and 600 below. |
| Knockback | The Smash formula: knockback grows with the victim's damage after the hit, the move's damage, and its knockback growth, and shrinks with weight. Launch speed falls off steadily. Hitstun is 0.4 frames per point of knockback, worked out without the weight (Caleb's change in Balance pass 3), so heavy fighters fly less far but are stunned as long as anyone. |
| Hitlag | Both fighters freeze briefly on a hit (4 to 18 frames, by damage). Multi-hit moves freeze for 2 frames per hit. |
| Hitboxes and hurtboxes | Hurtboxes come from the stick figure's own limbs, head and torso, so they follow every animation (this is how Phantom's hurtbox shifts). Spartan's sword is not a hurtbox (a disjoint). A hitbox on a fist or foot covers the forearm or shin too, so point-blank hits connect. |
| Rough KO percents | Against a mid-weight fighter in the middle of the stage: Spartan's Grand Slash about 80%, Buster's Hammer Fist about 100%, Fisticuffs' Haymaker about 100%, Ranger's fully charged shot about 110%, Phantom's Reaper Kick about 100% from the heel (Drill Kick about 180%, Arc Kick about 230%). Edge KOs come earlier. |
| Respawn | After a KO: 1 second off screen, then a platform above the stage for up to 2.5 seconds (any button drops), then 2 seconds where the fighter cannot be hit (blinking). |
| End of match | Last fighter with stocks wins. At 3:00, most stocks wins. A tie goes to sudden death: 1 stock each at 300%, with a new countdown; after 1 minute it is a draw. If both fighters lose their last stock on the same frame, that is also a sudden death (or a draw, if it happens in sudden death). |
| Leaving a CPU match | Ends it (Leave button, or Escape), back to character select. |

### Movement and defense

| Item | Choice |
| --- | --- |
| Double jump | One per jump, back on landing. Valkyrie has three (see Valkyrie). |
| Short hop | Let go of jump during the crouch before the jump for a lower jump. |
| Fast fall | Tap down in the air while falling. |
| Floatier fighters (Caleb's change before merging Stage 3, to make aerials easier to use) | Everyone's gravity is 15% lower and normal falling speed 10% lower; jump speeds are 4% lower so jumps get longer more than they get higher. Fast-fall speed is unchanged, so coming down quickly is still there when wanted. Measured: short hops and full jumps last 13–15% longer (Fisticuffs' short hop 29 → 33 frames, Buster's 25 → 28, Phantom's 37 → 42) and are 7–10% higher. Up special launch speeds were trimmed to keep their heights where they were just set (Fisticuffs 17 → 15.6, Spartan 16 → 14.7, Ranger 17.5 → 16.1, Buster 18 → 16.2). Launched fighters fly a little further, so some upward KOs come about 10 percentage points earlier (e.g. Spartan's Rising Slash 250% → 230%). |
| Landing during an aerial (Caleb's change before merging Stage 3) | An aerial that lands before its hit is over keeps going on the ground, with its hitboxes, for up to 8 frames (or until its last hitting frame, if that is sooner); then the move's landing lag starts. An aerial that lands after its hit is over goes straight into its landing lag, as before. Landing lag values are unchanged. Of the two ways Caleb suggested (a landing hitbox, or letting the attack carry on), this is the second: each move keeps its own hitbox and look, with nothing new to learn. From the top of a short hop, every fighter's down aerial except Buster's now comes out (on landing), and so do Buster's forward and up aerials; Buster's Drill Stomp starts too late (frame 14) to fit. |
| Platforms | Pass through from below; hold down for 3 frames to drop through. |
| Spot dodge (ground) | 24 frames; cannot be hit on frames 3–17. No limit. |
| Spot dodge (air) | 30 frames; cannot be hit on frames 3–20; keeps falling, no steering. Once per jump, back on landing. |
| Glide (Valkyrie, after Shuttle Loop; Caleb: free to act) | About 5.8 forward and 1.2 down per frame. Up holds height (0.3 down) but slows to 4.2; down dives (7 down, 5.5 forward); back slows to 3.4. No turning around. Any attack, jump or dodge ends it and comes out at once, with jumps left kept; it also ends on landing, on a ledge grab, when hit, or after 4 seconds. |
| Up special | Once in the air, back on landing (spec). There is no helpless state afterward. Getting hit also gives it back (Caleb's change in Balance pass 3; the spec only names landing), so being knocked offstage right after using it is not an automatic loss. |
| Recovery boost (Caleb's change before merging Stage 3) | Every up special goes about 20–25% higher, and holding a direction during it carries the fighter about 15–60% further sideways. (After the fighters were made floatier, the heights were kept the same and the sideways distances grew a little more with the slower fall: Fisticuffs 290, Spartan 235, Ranger 346, Buster 229, Phantom 467.) The sideways part is steering (more air control during the move), not a built-in push, so a fighter going straight up next to the stage does not get carried in under it. Measured from a standstill in the air, height / sideways before → after: Fisticuffs 177 / 168 → 215 / 266; Spartan 162 / 143 → 201 / 212; Ranger 209 / 235 → 254 / 318; Buster 148 / 147 → 184 / 213; Phantom's teleport 210 → 250 (250 / 377 → 307 / 436). Side specials are unchanged (Caleb: up specials only). |
| Ledges (Caleb's request after Stage 2) | The two top corners of the main stage are ledges (platforms have none). A fighter grabs one automatically when falling (or rising during an up special) with the corner within reach of the hands, unless holding down or still launched. One fighter per ledge. Grabbing gives back the double jump, up special and air dodge. During an up special it also catches from slightly under the stage (the centre up to the body's half-width plus 10 inside the edge), so a recovery that comes up just under the lip takes the ledge (Caleb saw every fighter bonk there). |
| Ledge invincibility | A grab after landing or being hit can't be hit for 24 frames. A regrab without landing in between gets none, so hanging can't be repeated forever for safety. |
| On the ledge | After 6 frames: toward the stage or up climbs (22 frames; can't be hit for the first 14), jump jumps up from the ledge, away or down lets go. A direction already held when grabbing doesn't count until it is let go and pressed again, so holding toward the stage while recovering doesn't climb by itself. Dodge also climbs. Attack and special do nothing (a ledge attack would be a 13th move). After 5 seconds hanging, the fighter lets go. |
| Regrab | After leaving a ledge, it can't be grabbed again for 30 frames. |
| Stage edge collision (fixes the back-and-forth clipping Caleb saw) | Landing on the stage needs the fighter's centre over the stage. The sides push the body out by how far its feet are below the top, so stepping off the edge slides off smoothly. Before, the collision box could land a fighter whose centre was already past the edge; the next frame found no ground under it, and it flickered between standing and falling. The old "step-up" onto the stage is gone; ledges replace it. Rising into the underside close to an edge (within the half-width plus 48), unless launched, slides the fighter out around the edge, 12 a frame, instead of stopping it, so an up special that clips the lip carries on past it. |
| Input buffer | A button pressed up to 6 frames before the fighter can act still counts. |
| Tap jump (Caleb's request after Stage 2) | A setting on the Platfighter's Settings page, **off by default** so the controls stay as they were. When on, pressing up also jumps. The jump waits 3 frames after up is pressed: Attack or Special in that window gives the up attack or up special instead. Holding up holds the jump (full jump); a quick tap is a short hop; pressing up again in the air double jumps. It is applied on the player's own device before the buttons are used or sent online, so each player has their own setting and online matches stay in sync. Kept until the app closes, like the other settings. |

### Armor, reflect and projectiles

| Item | Choice |
| --- | --- |
| Armor | Removed in Balance pass 4 (Caleb's change; the spec gives Buster armor on some moves). Before that: Buster only, on Hammer Fist, Charging Tackle, Rocket Leap and Ground Pound; a hit with knockback under 100 did its damage without launching, and from Balance pass 3 it held for one hit per move. Instead, Buster now takes 15% less knockback while standing on the ground. The armor code stays in the simulation, unused. |
| Reflect | Spartan's Deflect. Sends arrows, orbs and boulders back 15% faster and 25% stronger, now owned by Spartan. The thrown sword and shockwaves are not reflected. |
| Ranger | Up to 5 arrows at once; a shot past the limit does not fire. Arrows fall slightly, stop at the stage, and keep flying if Ranger is hit. Charged Shot: speed up to +60%, damage up to +8, more knockback; since Balance pass 6 it can be aimed 45 degrees up or down (hold up or down while drawing, until the arrow leaves; an aimed arrow leaves from the hand). |
| Ranger's ending lag (Caleb's change before merging Stage 3) | More frames before Ranger can act again after shooting: Quick Shot, Skyward Shot and Up Shot 26 → 34; Air Shot 28 → 36; Dive Shot 30 → 38; Charged Shot 36 → 46; Triple Shot 38 → 48. Landing lag is unchanged. Rocket Arrow (the up special) is left out (Caleb). |
| Spartan | One sword, thrown as a stab (Caleb's change before merging Stage 3), aimed 30° upward since Balance pass 2 (Caleb's change): it flies straight out along that line point first, slows down, and comes straight back along the same line without turning; it can hit on the way out and again on the way back. It hits along the front of the blade, from just behind the middle to the tip. Spartan catches it when it reaches the hand; if Spartan has moved off its line (for example, is in the air), it flies on and is back in hand once it leaves the screen, about a second later than a catch. While it is out, moves that need the sword do not start. If Spartan is KO'd, the sword is back in hand on respawn. |
| Phantom's kill power (Caleb's change before merging Stage 3) | More knockback growth on the three finishers: Air Lunge 82 → 92, Recoil Kick 76 → 86, Arc Kick 78 → 88. Against a mid-weight fighter in the middle of the stage they now KO at about 190%, 190% and 260% (were 210%, 220% and 300%). Phantom stays the weakest finisher, as the spec's weakness says. (Recoil Kick was later replaced by Reaper Kick: see Balance pass 1.) |
| Buster | One boulder at a time (Boulder Roll waits until the last one is gone). It rolls along the floor at 4 units a frame, drops to the floor first if thrown in the air, rolls off ledges, and breaks when it hits someone or after 4 seconds. Ground Pound's shockwaves are separate and not limited. |
| Phantom | Two orbs at a time (Balance pass 4; was one). Orbs fade if Phantom is hit. Since Balance pass 6 an orb knocks harder right after it leaves the hand (base knockback 52 and growth 78, fading to 30 and 42 over 22 frames, about 200 units). |

### Balance pass 1 (Caleb's changes after Stage 3)

Caleb named the five changes; the amounts and the details are Claude Code's.

| Item | Choice |
| --- | --- |
| Ranger's arrows | Every arrow (all bow moves, including Charged Shot and Rocket Arrow's arrow) leaves 40% of the usual hitstun. Quick Shot at 0% / 50% / 100%: 15 / 20 / 25 frames → 6 / 8 / 10. The short freeze on impact is unchanged, so overall the opponent can act 6–10 frames sooner after an arrow. Knockback (how far it pushes) is unchanged. |
| Spartan's sword | About 10% shorter (105 → 94), in hand and when thrown (the thrown blade's hit area shrank to match), and every sword hitbox is 1 unit thinner. |
| Buster | Every attack's hitbox is 3 units larger in radius (the Ground Pound shockwaves are unchanged). Run speed 4.4 → 4.8 and air speed 3.3 → 3.6 (about +9%), with slightly quicker acceleration on the ground and in the air. Buster is still the slowest fighter. |
| Phantom's down special | Recoil Kick (kick, then hop back) is replaced by **Reaper Kick**, a kill move: the knee comes up, then the heel drives out while Phantom leans far back. Only the heel is the strong hit (13 damage, KOs a mid-weight in the middle of the stage at about 120%); the shin does a weak 7. Starts on frame 13, can act again at 46, so a miss is easy to punish. A first version KO'd at 90%, stronger than Buster's and Fisticuffs' best, so it was toned down to keep Phantom behind the heavy hitters. |
| Fisticuffs' combo moves | Taken to be the moves made for combos: One-Two (both punches), Uppercut, Low Sweep, Double Jab (both punches) and Flip Kick. Damage up: 3 → 4, 4 → 6, 6 → 8, 5 → 7, 4 → 5 and 6 → 8, 7 → 9. Knockback down 16–20% at every percent, so opponents stay closer for follow-ups. The finishers (Straight Punch, Spin Kick, Stomp, Haymaker) are unchanged. Double Jab and Flip Kick no longer KO before 300% (they did at about 290% and 230%). |

### Balance pass 2: hitboxes (Caleb's request after Balance pass 1)

Caleb: Ranger and Spartan seem strongest; the others need more generous hitboxes, especially Fisticuffs, whose hits connect inconsistently. Ranger and Spartan are unchanged.

| Fighter | Change |
| --- | --- |
| Fisticuffs | Every hitbox 5 units larger in radius (most fist and foot hitboxes go from 9–12 to 14–17). Active frames longer: One-Two +1 frame on each punch, Straight Punch +2, Uppercut, Low Sweep, both Double Jab punches and Haymaker +1. |
| Phantom | Every hitbox 4 units larger (Reaper Kick's heel sweet spot +2, so it stays a precise hit). Active frames +1 on Quick Poke, Lunge Poke, Arc Kick, Air Lunge and Scissor Kick. |
| Buster | Every hitbox 2 units larger (on top of Balance pass 1's +3). |
| Spartan (Caleb's follow-up: a more precise Spartan) | Sword Throw is aimed 30° upward instead of level: it clips opponents close to Spartan or jumping at him, and passes over grounded opponents further away; it still comes straight back along the same line. Wide Slash (side tilt) became **Lunging Thrust** and Low Sweep (down tilt) became **Low Thrust**: the sword draws back level, then drives straight forward at one height (chest height and near the floor), hitting for 3 frames (Wide Slash hit for 5, sweeping through an arc). Damage and knockback are unchanged. Caleb picked these two; the other swings keep their arcs. |

How it was measured: for each move, an opponent (Ranger's body) is placed at every point of a 6-unit grid around the attacker, and the points where any active frame of the move touches them are counted (a bigger count is a bigger target area). Fisticuffs, before → after: One-Two 154 → 192, Straight Punch 151 → 188, Uppercut 257 → 305, Low Sweep 93 → 119, Double Jab 241 → 314, Flip Kick 504 → 585. For comparison, Spartan's Sword Poke is 340, Wide Slash 601 and Overhead Arc 1113 (the sword's range is the spec's "great range"). Fisticuffs' reach is about the same against every fighter's body, so no single matchup was the cause. Hits slipping between two frames of a fast swing were checked too: it barely happens (only Spartan's Sword Spin and Sky Arc lose a little), so it was not changed.

Spartan's target area: side tilt 601 → 333, down tilt 294 → 238. In CPU matches the thrown sword went from 52% of Spartan's damage to 27%.

CPU vs CPU check (Hard against Hard, every pairing 16 times; this measures the CPU's way of playing each fighter as much as the fighters). Wins before the pass → after the hitboxes → after the Spartan changes: Spartan 97% → 95% → 64%, Buster 72% → 73% → 94%, Ranger 50% → 44% → 53%, Fisticuffs 31% → 38% → 39%, Phantom 0% → 0% → 0%. With Spartan toned down, the CPU's Buster now wins most matchups (15–1 against Spartan). The CPU playing Phantom mostly throws its slow orb and Blink Strike from far away (in four matches against Ranger: 237 orbs, 176 Blink Strikes, under 20 of everything else), which is a CPU problem rather than a hitbox one.

### Balance pass 3 (Caleb's requests after Balance pass 2)

Caleb: Phantom's moves connect unreliably and its movement makes them awkward; it should do more damage, combo better, and have offstage tools, as it is meant to excel at edgeguarding. Buster's range and Boulder Lob should come down, and his weakness (easily comboed) does not show in play. Getting hit should give back the up special. Caleb picked: fix Dive Kick's movement only; a spike and a pull-in hit as the offstage tools; armor that holds for one hit, and hitstun that does not depend on weight.

| Item | Choice |
| --- | --- |
| Phantom: Dive Kick → **Hover Stomp** (down aerial) | No more plunge (it dove diagonally down with gravity off for 13 frames). Now Phantom hovers a moment with the knees tucked (falls under 20 units in its first 14 frames), then stomps both feet down: frames 8–9 spike (10 damage, sent straight down), frames 10–14 a weaker hit (6). |
| Phantom: Whirl (neutral aerial) pulls in | Its hits now launch toward Phantom's centre and a little up, with low knockback (6 damage, was 5): the opponent ends up close and above Phantom, ready for a follow-up on stage or off it. Chosen because Whirl hits all around and is Phantom's easiest move to land. |
| Phantom: damage and combos | Damage up by 1–2 on Quick Poke (3 → 4), Lunge Poke (7 → 9), Arc Kick (6 → 8), Slide (6 → 8), Air Lunge (8 → 10, its near part 6 → 8), Scissor Kick (6 → 8) and Blink Strike (7 → 9). Knockback growth lowered on the combo moves so opponents stay closer (Slide, Scissor Kick, Lunge Poke, Blink Strike, Quick Poke) and trimmed on the finishers so the extra damage does not make them much stronger: Air Lunge now KOs at about 170% (was 190%), Arc Kick 230% (was 250%). Lunge Poke, Slide, Air Lunge, Blink Strike and Reaper Kick keep their movement (Caleb). |
| Buster: range | Every hitbox 3 units smaller (net +2 compared with before Balance pass 1). |
| Buster: Boulder Lob | Damage 16 → 12, less knockback: KOs a mid-weight in the middle of the stage at about 190% (was 120%). |
| Armor (all four of Buster's armored moves) | Holds against one hit per move; the next hit in the same move goes through. |
| Hitstun and weight (everyone) | Hitstun is now the same for every fighter for the same hit at the same damage; weight still shortens how far they fly. Compared with before, at high damage Buster is stunned up to about 15% longer, Spartan about 4% longer, Ranger about the same, Fisticuffs about 7% shorter and Phantom about 11% shorter (less difference at low damage, where a hit's base knockback dominates). |
| Up special after being hit (everyone) | Being hit gives back the air up special. |

CPU vs CPU (Hard against Hard, every pairing 16 times; this measures the CPU's way of playing each fighter as much as the fighters), wins after Balance pass 2 → after pass 3: Buster 94% → 92%, Spartan 64% → 69%, Ranger 53% → 47%, Fisticuffs 39% → 42%, Phantom 0% → 0%. Phantom's 0% is the CPU's way of playing it (mostly throwing its orb from far away), so the CPU numbers say nothing yet about the Phantom changes.

### Balance pass 4 (Caleb's requests after Balance pass 3)

Before changing anything, the CPU matches were measured fighter by fighter (Hard against Hard, every pairing 8 times). Buster was winning on his kill moves, not armor: Boulder Lob made 47 of his 89 KOs and Hammer Fist 22, while armor absorbed about 2 hits a match. Phantom made 12 KOs and lost 83 stocks: the CPU threw its slow orb 1,387 times, which chips but almost never KOs, and rarely used its kill moves. Caleb then asked for the changes below.

| Item | Choice |
| --- | --- |
| Buster: Boulder Lob → **Boulder Roll** | Bowled underhand along the floor instead of lobbed in an arc: it rolls slowly (4 units a frame), drops to the floor first if thrown in the air, rolls off ledges, and breaks on a hit or after 4 seconds. Damage and knockback as after pass 3 (12 damage). It only hits opponents on or near the floor now, so it is no longer an anti-air. |
| Buster: no armor | All armor removed; Buster takes 15% less knockback while standing on the ground instead. |
| Buster: Hammer Fist | Hits 4 frames later (frame 18 instead of 14), with 6 more frames in total. Damage and knockback unchanged. |
| Phantom: Reaper Kick, a kill move to win with | Same start (frame 13), less ending lag (46 → 36 frames in total). The heel is a bigger, stronger hit (15 damage, KOs a mid-weight in the middle of the stage at about 100%), and the rest of the leg now launches too (11 damage) instead of a weak 7. |
| Phantom: less ending lag | Caleb asked not to make moves faster, so startup and active frames are unchanged. Every other move keeps 70% of its ending lag (the frames after its last hit): for example Quick Poke 12 → 10 frames in total, Lunge Poke and Air Lunge 24 → 20, Arc Kick, Whirl and Scissor Kick 22 → 18, Hover Stomp 30 → 25, Phantom Orb 28 → 23, Phase Rise 32 → 27. Landing lag on its aerials is 4 (Hover Stomp 6). The animations are shortened to match. |
| Phantom: more consequential hitboxes | Every hitbox 4 units larger; Air Lunge's tip and Arc Kick hit a little harder (KO at about 160% and 210%). |
| Phantom: stronger orb | Flies almost twice as fast (9 units a frame instead of 5), 8 damage instead of 6, two at a time. Its knockback was kept the same: a trial with more knockback made the orb Phantom's main way to KO (53 of 71 KOs), which is not what Reaper Kick is for. |
| CPU: Phantom fights in the air | See the CPU section. With the orb allowed from further than 300 units, the CPU Phantom used its aerials and Reaper Kick the most but won 16%; from further than 200 units, it mixes orbs at range with aerials up close and wins 22–25%. 200 was kept. |

CPU vs CPU after this pass (Hard against Hard, every pairing 8 times): Buster 88%, Spartan 53%, Ranger 47%, Fisticuffs 41%, Phantom 22% (was 0%). Phantom's KOs: orb 28, Reaper Kick 15, Air Lunge 5, Hover Stomp 2. Buster still wins most matches: his rolling boulder does the most damage of any move in the game (the CPU bowls it constantly), and Rocket Leap (his up special, 13 damage, KOs at about 130%) became his main KO move (42 of 88).

### Balance pass 5 (Caleb's requests after Balance pass 4)

| Item | Choice |
| --- | --- |
| Buster: Rocket Leap | Only a blast around his feet just before he jumps (frames 7–9), on the ground or in the air, instead of his fists hitting the whole way up (frames 10–24). It hits an opponent beside him, or just below his feet in the air, and nothing above him (before, it reached 280 and more above his feet). Damage and knockback unchanged (KOs at about 130% when it lands). A first try that kept the fist hit for the first 3 frames of the jump still reached about 160 above him, so Caleb asked for a hit around the feet instead, first on the ground only, then in the air too. |
| Buster: Boulder Roll | Slower (3.2 units a frame, was 4) and smaller (radius 19, was 22). |
| CPU: jumping over rolling shots | All levels jump over a boulder or shockwave rolling toward them along the floor, counting their own movement toward it. Measured with a boulder bowled at a CPU 300 away: Hard now gets hit 8 times in 48 (was every time), Normal 24 in 48 (was 22 in 24), Easy 42 in 48 (about as before). |
| CPU: more jumping in general | Walking up to an opponent from 80–260 away, the CPU now and then jumps in instead (Hard most often, Easy rarely). |

CPU vs CPU after this pass (Hard against Hard, every pairing 8 times): Spartan 72%, Phantom 53%, Fisticuffs 47%, Buster 44% (was 88%), Ranger 34%. Rocket Leap went from 42 of Buster's KOs to none; his KOs are now spread over the boulder (16), Hammer Fist (15) and Charging Tackle (10). Spartan is on top again because his matchup against Buster turned around (Buster beat him 15–1 before); with the fist version of Rocket Leap and no extra jumping in general, Spartan was also 75%, so the jumping is not the cause.

### Valkyrie (Caleb's new fighter after Balance pass 5)

Caleb's definition is in the spec. The rest is Claude Code's reading of it; the moves and their numbers are in [`characters.md`](characters.md).

| Item | Choice |
| --- | --- |
| 4 jumps | The jump from the ground plus three in the air, where everyone else has one (the double jump). They come back on landing and on a ledge grab, like the double jump. The first jump is about as high as Ranger's (174); each air jump adds about 132, so all four reach 571 above the stage (Phantom's two reach 430, the most of the others). |
| Great air mobility, poor ground mobility | Air speed 5.8, the fastest (Phantom 5.2), with quick air acceleration and the floatiest fall (gravity 0.4, falling speed 7.6). Run speed 4.5, the slowest (Buster 4.8), and slow to get going on the ground. |
| Small build | About three quarters the size of the others (76 tall, where a standing fighter is about 100), with thinner limbs. Weight 76, the lightest (Phantom 78), so Valkyrie flies early. |
| Wings | Drawn from the upper back: folded on the ground, spread and flapping in the air. They are not part of the hurtbox, so they do not make Valkyrie easier to hit. |
| Sword, poor range | A short sword (28 long; Spartan's is 94). Like Spartan's, it is not a hurtbox. Measured from Valkyrie's centre, the ground moves reach 102–108: about the same as Phantom (81–108), a little more than Fisticuffs' fists (93–96), less than Buster (108–117), and well under Spartan (180–189). The first version reached up to 129; the sword was shortened twice and the ground poses lean in less. |
| Stronger aerials | The ground moves do 3–6 damage, are quick, and send up with little growth (none KOs before 300%). The aerials do 8–13 and most of the KOs: Sky Cleave KOs a mid-weight at about 160% in the middle of the stage, and Talon Stab's tip spikes (sends straight down) for finishing offstage. Ascent's last hit KOs at about 230%. |
| Vertical combos | Most hits send nearly straight up: Hilt Poke, Low Flick, Rising Cut and Gale Burst pop opponents up with little growth, and Updraft Slash sends straight up a bit further, so with three air jumps and the best air speed Valkyrie can follow upward and keep hitting. Ascent hits several times on the way up, then launches straight up. |
| No projectile | Caleb's definition has none (the spec names projectiles for Ranger, Phantom, Buster and Spartan). Gale Burst, a beat of the wings, hits only close around Valkyrie. |
| Recovery | Ascent goes up 196, less than everyone but Buster (182), but steers 396 sideways, second to Phantom (467). With the three air jumps first, Valkyrie gets back from as far as Phantom: 750 out, or 600 straight below the ledge. |
| Color | Teal (Caleb did not give one); the second copy is a darker teal. |
| CPU | Plays in the air like Phantom: often jumps in toward the opponent (a little more often than Phantom), attacks with aerials from close in the air, and steers sideways with Ascent when recovering. On the ground it keeps close (about 45 away). |
| Balance | The first version won 78% of CPU matches (Hard against Hard, against the other five). Trimmed: damage and knockback growth on Sky Cleave (KO 130% → 160%), Wing Spin (220% → over 300%), Spear Dive and its landing, and Ascent's last hit (200% → 230%); landing lag on Wing Spin 6 → 8 and Sky Cleave 9 → 11; weight 82 → 76. |

CPU vs CPU with Valkyrie (Hard against Hard, every pairing 8 times, 40 matches per fighter): Spartan 75%, Ranger 50%, Fisticuffs 48%, Buster 45%, Valkyrie 43%, Phantom 40%. With 40 matches each, a difference of under about 8 points is within chance. Valkyrie's KOs come mostly from Sky Cleave (49 of 80), then Ascent (13); the damage is spread over Wing Spin, Ascent, Sky Cleave and Spear Dive.

### Balance pass 6 (Caleb's requests after Valkyrie)

The moves and their numbers are in [`characters.md`](characters.md); this is how Caleb's requests were read.

#### Caleb's answers used here

| Question | Answer |
| --- | --- |
| How is each attack's priority set? | Hand-set tiers (light, medium, heavy). |
| Two attacks of even priority touch | Attacks trade (both carry on); projectiles clank (destroy each other). |
| A projectile meets a move of even priority | The projectile is destroyed; the move carries on. |
| Spartan's forward tilt swipe | A level side swing. |
| Spartan's down tilt | The scooping sweep that pops opponents up. |
| Ranger's hat | A wide-brimmed hat. |
| "Give Buster back some startup, especially on his jump" | A faster jump only (his moves keep their startup). |
| What Valkyrie can do while gliding | Free to act: any attack, jump or dodge ends the glide at once; jumps left are kept. |
| Phantom's new side special | Tether Zip. |

#### Priority

| Item | Choice |
| --- | --- |
| Tiers | Light, medium or heavy for every attack and projectile, set by hand (mostly by how hard it hits, with jabs and quick pokes light and the big finishers heavy); listed per move in characters.md. A hit can have its own tier: a sweet spot can be stronger than the lingering part (Flying Kick, Spike Punch, Drill Kick, Talon Stomp). |
| Higher beats lower | When hitboxes of two fighters touch, the lower move stops: its fighter is pushed back a little and stunned for 16 frames, and both freeze for 6 frames. The higher move carries on and can still hit. |
| Even attacks | Trade (Caleb): nothing happens where they touch, and each still hits the other fighter if it reaches them. |
| Projectile against an attack | A higher or even attack swats the projectile away and carries on (Caleb's answer for even); a lower attack is stopped and the projectile flies on. Spartan's Deflect still reflects arrows, orbs and boulders instead. |
| Projectile against projectile | The higher destroys the lower; even ones destroy each other (Caleb). |
| Spartan's sword | Never destroyed: a thrown sword that loses flies back to him; the tossed one (Sky Toss) falls. |
| Command grabs | Never clash, either way (a grab is not an attack). |
| Ranger's arrows | Single arrows medium, Charged Shot heavy, Triple Shot and Rocket Arrow light. With all arrows light, any attack in their path wiped them out; that alone did not explain her CPU result (see the CPU note below), but light arrows also lost to every jab. |
| Look and sound | A cream star with navy rays where they meet, and a short metallic clank. |

#### Fighters

| Fighter | Change |
| --- | --- |
| Spartan: up special | Sky Toss, after Ike's Aether: the sword is tossed straight up (it hits on the way up), Spartan hangs a moment, leaps after it (catching it near the top, about frame 28), flips, and plunges straight down sword first, dragging opponents down; he can catch the ledge on the way, and landing hits again. Measured: 205 up and 233 sideways (Rising Slash was 203 and 235); whole recovery 475 out (was 450). Without the sword in hand he leaps without the toss. Like Ike's, a plunge that misses the stage falls a long way: CPU Spartan self-destructed 17 times in 120 matches (8 before). |
| Spartan: up air | Blade Lift, after Cloud's up air: the sword held level and lifted from chest height to over his head. KOs at about 180% (was 140%) and covers less upward, but starts low enough to catch opponents beside him. |
| Spartan: forward tilt | Level Sweep: a horizontal swing seen from the side. The blade sweeps round from behind him at chest height, drawn shorter while it turns toward the viewer, and hits at full length in front. KO about 120% (was 110%). |
| Spartan: down tilt | Floor Scoop: the blade sweeps round along the floor to the front, then scoops up. Pops opponents up (no longer a kill move: over 300%, was 180%). |
| Ranger | Charged Shot can be aimed 45 degrees up or down. A wide-brimmed tan hat with a band in her colour, and a quiver on her back (drawn only). |
| Buster: look | Orange (Caleb), the second copy rust. Built like an ape (Caleb): arms 60 long and thick (were 44), a regular head (radius 10, was 14), a short hunched body (88 tall, was 118) with the knuckles near the floor, and knuckle-walking. The arms are part of the hurtbox, so they are bigger targets; the fist moves reach further than before (jab 129, was 114; Hammer Fist 126, was 117), after taking out most of the step forward added to them. |
| Buster: jump and air | Jump crouch 4 frames (was 6), full jump 141 high (was 130), with the double jump 256 (was 236); air speed 4.2 (was 3.6). Whole recovery 525 out (was 450) and 292 sideways from the up special (was 250). |
| Buster: side special | Lunge Grab: a dashing command grab with both arms out, in the air too. Catching swings the opponent over his head and throws them behind him: 10 damage, KO at about 150% (Charging Tackle was also 150%). |
| Buster: down tilt | Suplex: a command grab low in front (from frame 8). He lifts the opponent over his head and arches back, slamming them into the floor behind him: 12 damage, KO about 190%. |
| Fisticuffs | Up tilt reaches 99 in front (was 66) and pops the opponent up to just above him. Neutral air: a sex kick (Flying Kick, KO 200%). Forward air: a kick flurry ending in an upward launch (Kick Flurry). Up air: a straight-up kick (Sky Kick). Down air: a spike punch (Spike Punch). Up special: a strong jumping uppercut (Jumping Uppercut), hardest as it leaves the ground: KO about 170% (Rising Uppercut never KO'd). Haymaker: flames on the fist through the wind-up and the punch, with embers (drawn only). |
| Phantom: damage | One point less on nearly every hit (about 10–15%); Reaper Kick's knockback growth was raised a little so it still KOs at about 100%. |
| Phantom: jab, forward tilt, forward air | Made distinct from each other and from the side special: a knee up close (Knee Pop), a crescent kick that arcs over the top (Crescent Kick), and a diagonal dive kick (Drill Kick, KO about 180%). |
| Phantom: side special | Tether Zip (Caleb's pick): a ghostly chain thrown forward, up to 210 away (20 degrees up in the air). Catching an opponent zips her in with a kick and springs her back about 300 the other way; catching a ledge reels her in to hang from it (it lines up from, for example, 150 out and 100 below). A miss has 36 frames of ending lag. |
| Phantom: orb | Stronger at close range (KO about 260% right out of the hand; was over 300%), and more ending lag on the ground and in the air (32 frames, was 23). |
| Valkyrie: moves | More variety in body movement and in where the hits are: a hilt strike (Pommel Strike), a lunging stab, a wing flare with the hit above her shoulders (the wings spread on screen), a sweep with the feet, a backflip slash, and a two-footed stomp (Talon Stomp) in place of the sword stab. |
| Valkyrie: up special | Shuttle Loop, after Meta Knight's: flies up slashing, loops back over the top and round while still climbing, then glides (above). Holding a direction at the start turns her that way. Measured: 156 up (Ascent was 196) and 679 sideways with the glide; whole recovery unchanged (750 out, 600 below). |
| Kill spark | The background takes the attacker's colour (Caleb). |
| Body movement (Caleb: more in general) | Steps, lunges, crouches, leans and leg movement added to the moves of every fighter, beyond the ones reworked above. |

CPU vs CPU after this pass (Hard against Hard, every pairing 8 times, 40 matches per fighter): Fisticuffs 63%, Spartan 55%, Buster 50%, Ranger 45%, Valkyrie 45%, Phantom 40% (before: Spartan 75%, Ranger 50%, Fisticuffs 48%, Buster 45%, Valkyrie 43%, Phantom 40%). The first run had Ranger at 5%: the CPU was aiming her Charged Shot badly (holding up or down by accident, aiming down into the floor, and firing up-aimed shots at targets that were not on their line), and the held direction turned its next moves into Rocket Arrow and Backflip Kick. With the CPU shooting straight, she is back in the middle. Two other first-run results were trimmed: Fisticuffs' Jumping Uppercut (heavy on its first frames, 25 KOs) is now medium with a little less damage and knockback, and Tether Zip's reach and kick were reduced (26 KOs from the kick, Phantom at 65%).

### Weight, speed and jump

Ratings from the archetypes (1 = lowest of the six, 5 = highest, worked out from the numbers):

| Fighter | Weight | Run speed | Jump height |
| --- | --- | --- | --- |
| Fisticuffs | 85 (light) | 7.2 (fast) | good |
| Spartan | 108 (heavy-ish) | 5.0 (slow) | low |
| Ranger | 98 (average) | 6.0 (average) | average |
| Buster | 130 (heaviest) | 4.8 (slow) | lowest, falls fastest |
| Phantom | 78 (very light) | 8.0 (fastest) | highest per jump |
| Valkyrie | 76 (lightest) | 4.5 (slowest on foot; fastest in the air, 5.8) | highest in all (four jumps) |

Recovery distance, measured by script, follows the same order: Phantom and Valkyrie (even), then Ranger, Fisticuffs, then Spartan and Buster (about even after the recovery boost).

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
| Phone | Landscape. A joystick on the left half (it appears where the thumb touches); Attack, Special, Jump and Dodge on the right. The stick counts as up or down only when pushed mostly up or down, so a slightly diagonal push still gives a side attack. Turning the phone upright pauses a CPU match with a message. An online match can't pause for one player, so it keeps going behind the same message; the Leave button stays on top. |
| Directions | Up or down held → up or down move; otherwise left or right → side move (the fighter turns to face that way); nothing → neutral. |

### CPU

The CPU presses the same buttons a player does.

| Level | Behaviour |
| --- | --- |
| Easy | Decides about 4 times a second, attacks about a third of the time when in range, wanders sometimes, never dodges, and misses its recovery about half the time. |
| Normal | Decides about 8 times a second, attacks most of the time in range, recovers, dodges an incoming attack about 1 time in 8. |
| Hard | Decides 20 times a second, aims where you will be when the move comes out, dodges about 1 time in 3, prefers KO moves when you are above 100%, recovers reliably. |

Each fighter keeps its own distance: Ranger stays far and shoots, Spartan stays at sword range, Fisticuffs gets close. Phantom (since Balance pass 4, Caleb's request) fights in the air: it jumps in toward the opponent (a short hop when close, a full jump when further), uses its aerials and specials up close, throws orbs only when the opponent is more than 200 units away, and backs off briefly after a hit. Every CPU jumps over a boulder or shockwave rolling toward it (Hard nearly always, Normal about half the time, Easy rarely), and now and then jumps in toward the opponent instead of walking. Measured over 30 matches each (after Balance pass 5, and the same again with Valkyrie added): Hard beats Easy 30–0 and Normal 29–1; Normal beats Easy 30–0. Since Balance pass 6: the CPU uses Buster's command grabs and Phantom's Tether Zip like any other move; it does not aim Ranger's Charged Shot (its aimed shots missed more than they hit and dragged Ranger from 60% to 13% of CPU wins, so it shoots straight); and Valkyrie's CPU dives out of a glide once over the stage, or ends it (a jump, else a dodge) if it is gliding away from the stage.

Since Caleb's observations after the modes update (CPUs attacking the wrong way, too many Haymakers, up specials bonking under the stage), measured in CPU matches before and after:

- **Facing its attacks.** The CPU judges each move by the way it will really go: side moves that turn (side tilt, forward air, side special) go toward the target, everything else (projectiles included) goes the way the fighter faces. Facing away on the ground with a move that would reach once turned, it turns first and attacks next time. Attacks started facing away: Ranger 28% → 3%, Phantom 29% → 5%, Spartan 18% → 8%, Fisticuffs 14% → 6%, Buster 12% → 7%, Valkyrie 8% → 9%; most of what is left are moves that hit both sides.
- **Big slow moves as finishers.** Choosing a move also weighs how long it commits the fighter (with its landing move), a little more against slow starts. Haymaker went from 33% to 17% of Fisticuffs' attacks.
- **Recovering from below.** Below the top of the stage the CPU steers for just outside the ledge (its half-width plus 8) instead of the middle. With the ledge and underside changes above, in 36 recoveries each from below: deaths after hitting the underside went to 0 (Spartan 10, Ranger 7, Buster 7, Fisticuffs 3 before); recoveries made: Ranger 28 → 35, Spartan 22 → 28, Buster 21 → 28, Phantom 10 → 18.
- **Two button bugs found while measuring.** Moves that fire a projectile were all counted as specials when the CPU measured their reach, so an air shot could be picked on the ground, where the same buttons make a different move (Ranger's Back-off Kick from out of reach: 356 times in 12 matches → 2). And a press made during another move or landing waited in the buffer and came out later as something else; the CPU now only picks an attack when free to act, and drops an aerial it picked if it lands first.

### CPU matches, watching and training (Caleb's friend's idea)

Caleb chose all of these: pick the CPU's fighter and the stage, watch CPU vs CPU, more than one CPU, and a training room with dummy settings, damage and reset, hitboxes and move info. All are offline, on this device only (online rooms stay at 2 players, as the spec says).

| Item | Choice |
| --- | --- |
| Where | Under Practice on the Platfighter's home page: Play the CPU, Watch CPUs, Training. |
| Play the CPU | Your fighter, then 1, 2 or 3 CPUs, each with its own fighter (or Random) and difficulty, and the stage (or Random). Random fighters and stage are the defaults, as before. With more than one CPU it is a free-for-all: every fighter goes after the nearest one, with the normal match rules (last fighter standing; at the time limit, most stocks, with sudden death among those tied). |
| Watch CPUs | 2, 3 or 4 CPUs (Hard by default), each with its fighter and difficulty, and the stage. Nothing on the device plays; the result names the winning CPU. Leave at any time. |
| Copies of one fighter | The first copy in its colour, the second in its alternate shade (as before), a third lighter and a fourth darker. |
| Training: setup | Your fighter, the dummy's fighter (or Random) and the stage. |
| Training: rules | No countdown, no timer and no stocks: a fighter knocked out comes back as usual and the match never ends. The clock and stock dots are not shown. Leave returns to the training setup. |
| Dummy settings | Stand (does nothing), Jump (a full jump after standing still for about two thirds of a second), Dodge (a spot dodge on the same rhythm), or CPU at Easy, Normal or Hard. The option list Caleb was shown also had "crouch"; the game has no crouch, so Dodge took its place. In every setting the dummy gets back to the stage when knocked off and gets off the ledge (the Hard CPU's recovery, Caleb's request after the modes update), then goes back to its setting. |
| Damage and reset | The dummy's damage can be set (−10, +10, or 0, 50, 100, 150%); it applies at once, after a reset, and when the dummy comes back after a KO. Reset (a button on screen and in the menu) puts both fighters back at their start and the dummy at its set damage. |
| Show hitboxes | Hurtboxes in blue outlines, attack hitboxes in red, command grabs in yellow, and projectiles' hit areas in red. |
| Move info | A panel in the corner for the last hit you landed on the dummy: the move's name, damage, knockback, and first active frame (none for projectiles and throws); and the combo: hits that land while the dummy is still stunned (or held) count toward it, with the total damage. |
| Training menu | Opens over the match and holds it still; dummy, damage, the two Show switches, and Reset. The settings are kept until the app closes, like the other setups. |

Checked in a browser: every option of the three setups starts the right match; matches with 3 and 4 fighters run to a result (12 CPU free-for-alls by script: all ended with a winner, none by time) and stay deterministic; the training menu holds the match, sets the damage, and turns hitboxes on; the move info shows Level Sweep with its startup (frame 9); the dummy jumps by itself; a knocked-out dummy keeps its stocks and comes back at the set damage; Reset works.

### Online (Stage 3)

| Item | Choice |
| --- | --- |
| Netcode | Rollback, written in this repo ([`src/net/rollback.ts`](../src/net/rollback.ts)). Both devices run the whole match. Your buttons are used 2 frames (about 33 ms) after you press them and are sent to the other device at once. When the other player's buttons for a frame have not arrived, the match goes on guessing they are still pressing what they pressed last; when the real ones arrive and the guess was wrong, the match is rewound to that frame and replayed, in the same 1/60 s. |
| How far ahead | At most 10 frames past the other player's last known buttons. Past that, the match waits for them, and after a third of a second of waiting it shows **Waiting for your opponent…** |
| Staying in step | If one device's clock runs ahead, it skips a frame now and then until the two are level again. |
| Checking | Every second the devices compare a checksum of the match. If they ever differ, the room creator's copy is sent and the other device continues from it. In testing this only happened when forced on purpose. |
| A frozen opponent | 8 seconds without the other device's buttons (for example their app is in the background) counts as a lost connection, so the match ends in a draw, as the spec says. |
| Who runs the room | The room creator's device keeps the room's state (picks, ready, votes) and settles anything random; the match itself runs on both. |
| Character select | Each player sees the other's pick and Ready live, like a local select screen. Ready locks the pick (press Not ready to change it). A Random pick is settled when both are ready. Someone who joins always starts at character select. |
| Stage select | A grid of the five stages with drawings, plus Random. You see that the opponent has voted, but not what, until both have; you can change your vote until then. The vote rules are Caleb's (spec). |
| Vote reveal | About 2.6 seconds: both votes, what a Random vote became, and the stage that will be played. Then the match starts. |
| After a match | The result shows for 5 seconds, then both go back to character select with their fighters still picked and Ready cleared (the rematch). |
| Leaving | **Leave room** on character select. In a match, the Leave button (or Escape) asks first; leaving mid-match is a draw for both (spec). The header's back link also leaves the room. |
| Same fighter on both sides | The second player's fighter uses the other shade, as against the CPU. |
| Tap jump | Each player's own setting, applied on their device before their buttons are sent. |
| Measured | Two browsers over a real WebRTC connection with 45–75 ms extra delay each way: about 60 frames a second, 6–15 rollbacks a second, no checksum mismatches. On a simulated network with up to 200 ms delay, uneven delay, and clocks 3% fast or slow, both devices always ended with exactly the same match as a single-device replay of the same buttons. Past about 100 ms each way the match starts waiting now and then: about 4% slower at 85–150 ms, about 14% slower at 130–230 ms. |

### Look and sound

- Stick figures with a navy outline under each colour, a ring for the head like the app icon, and props: Fisticuffs' gloves and headband, Spartan's sword and helmet crest, Ranger's bow, wide-brimmed hat and quiver, Buster's huge arms and fists, Phantom's red scarf, Valkyrie's sword and wings.
- A second copy of the same fighter uses a lighter or darker shade (red → salmon, blue → sky blue, green → lime, orange → rust, purple → pink-violet, teal → dark teal).
- The camera follows both fighters and zooms between a close and a wide limit. A bubble at the screen edge shows a fighter who is off camera, with their damage.
- HUD: the clock at the top; a card per player at the bottom with damage (turning red past 75%) and stocks.
- Effects: hit sparks (bigger and with screen shake for strong hits), staggered-stripe bursts for KOs, landing dust, boulder rubble, reflect and armor rings; a cream star with navy rays where two attacks clash, and a flash in the grabber's colour when a command grab catches (Balance pass 6).
- Movement and move effects (Caleb's request, kept separate from hit effects): dust pushed out along the floor on a jump; a ring in the fighter's colour under the feet on a double jump; dust kicked back when a run starts or turns around; a short streak above the head when a fast fall starts; a puff on a dodge and when Phantom reappears from Phase Rise; a small flash on a ledge grab and where a projectile leaves the hand; afterimages (fading copies of the last few poses) during spot and air dodges and during moves that carry a fighter fast (Blink Strike, Dash Punch, Charging Tackle, Slide, Lunge Poke, Wing Dash) or teleport; and a fading smear along the path of an attack's leading hitbox (fist, foot or sword tip) while it is active.
- Kill spark (Caleb's request, after Rivals of Aether II): when a hit will KO, the background turns the attacker's colour (Caleb's change in Balance pass 6; it was red; a projectile counts for its thrower) with navy and cream rays coming from the hit, a bigger spark and ring go off, and the screen shakes harder; it fades back over about three quarters of a second. Whether the hit will KO is worked out on screen only: a copy of the match is played forward (up to 2.5 seconds) with nobody pressing anything, and it counts only if the fighter is still flying from the hit when they cross a blast zone (falling later because they did not recover does not count). Only hits with knockback of 60 or more are checked. Nothing in the match itself changes, so online matches stay in step.
- A fast fight track (D minor) during matches. Effects for hits by strength, swings, jumps, landing, dodges, each projectile, reflect, armor, KOs, the countdown and "GAME!".
