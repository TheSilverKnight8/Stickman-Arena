# Stickman Arena — Platfighter + Pazaak Web App — Spec

Name: **Stickman Arena** (Caleb's choice; availability not checked).

Status: ready to build. This document records decisions Caleb has made, research findings that constrain the build, and items he has explicitly delegated to Claude Code's interpretation. There are no open items. If something comes up that this document does not cover, ask Caleb before deciding it.

## Working agreement

- Caleb wants a large say at every step of design and build. Ask before deciding anything not covered here or explicitly delegated.
- Items marked **Claude Code decides** were explicitly delegated by Caleb. Make a reasonable choice from the constraints given, document what you chose in the repo (so Caleb can read it), and expect Caleb to playtest and adjust.
- Implementation details (framework, file structure, libraries) are left to Claude Code, within the constraints below.
- This project is independent. It shares a workflow and visual style with Caleb's Engineering Management Portal and node-based synthesizer, but no code, accounts, or data are assumed to be shared.

## Platform

- Web app, same basic outline and workflow as the previous two projects: installable web app (PWA) hosted on GitHub Pages.
- Visual reference: the new shop manual app (https://github.com/TheSilverKnight8/shop-manual). Take the color scheme and style from that repo.
- Must run on free plans only. Caleb is on Supabase's free plan, and other tools may be more restrictive on free plans.
- Devices: keyboard on computer, touchscreen on phone.

## Site structure and navigation

- One home page with two buttons, one for each game.
- Each button leads to that game's own home page.
- Each game's home page holds the game-specific items: finding a match (creating a room, or joining one with a code), playing against a CPU, and settings.

## Online play (both games)

- Online only. There is no same-device multiplayer.
- Create a room and share a room code. The other player joins with the code. There is no matchmaking with strangers, no accounts, no lobby, no database, and the app is not intended for public release.
- The room code format, and how the creator shares it (for example copy button, on-screen display, or both), are **Claude Code decides**.
- The networking approach, including which signaling service and library to use, is **Claude Code decides**, within the constraints under "Technical constraints."
- Platfighter: 2 players online. 3-4 players online is a stretch goal, to be attempted only after the 2-player version works well.
- Pazaak: 2 players online through the same room setup.
- A phone player and a computer player can be in the same match.
- If a player leaves or loses connection mid-match, the match ends in a draw. This applies to both games.
- No saving and no progression of any kind.

## Room flow

Platfighter:
1. A player creates a room. Inside the room is character selection.
2. Once characters are selected, stages are selected.
3. Then the match is played.
4. When the match ends, play returns to character selection (which doubles as a rematch).
5. Character selection has a "leave room" button.

Pazaak: the same flow, with deck selection in place of character and stage selection.

## CPU opponents

- Both games have an optional CPU opponent. CPU modes must work without a network connection.
- Platfighter CPU: three difficulties, easy, normal and hard. Behavior per difficulty is **Claude Code decides**.
- Pazaak CPU: two levels, normal and advanced. They differ in deck composition, not skill. Normal uses only the basic plus and minus cards. Advanced also uses the flip cards and the tiebreaker.

## Platfighter

### Match rules
- Smash-style: hits build up damage, which makes later hits knock opponents farther. A player loses a stock by being knocked off the stage.
- Best of one, 3 stocks each, 3-minute time limit.
- At the time limit, the player with the most stocks left wins. If tied, sudden death: one stock each, everyone starts at 300 percent damage.

### Controls
- Computer: keyboard (key layout is **Claude Code decides**).
- Phone: landscape only. Virtual joystick on one side and four buttons on the other: normal attack, special attack, jump, dodge.
- Four actions: normal attack, special attack, jump, dodge. Attacks are modified by the stick direction (up, down, left/right as "side"), in the style of Rivals of Aether.

### Moves per character: 12
- Normal attacks (8): neutral, up, down and side, each with a ground version and an air version.
- Special attacks (4): neutral, up, down and side. Specials are the same on the ground or in the air.
- Specials are used freely, with no cooldown or meter, except the up special, which can be used once in the air and resets on landing.
- Shared movement and defense: double jump, and a spot dodge that works on the ground and in the air. No shield and no grab.
- Specific move designs are **Claude Code decides**, working from each character's archetype and constraints below. Do not invent moves beyond what those give you. Document each character's 12 moves in the repo.

### Mechanics left to Claude Code
- Moves can have movement properties.
- Some moves can have extra effects such as armor or reflect. Armor means the move takes damage but no knockback up to a knockback threshold. Threshold, duration, which moves and characters get armor and reflect, and any other effects are all **Claude Code decides**.
- Projectiles exist. Ranger, Phantom, Buster and Spartan each have at least one. Limits on how many can exist at once, and whether they disappear when their owner is hit, are **Claude Code decides**.
- Weight, move speed and jump height: relative ratings derived from the archetype descriptions, not exact numbers. **Claude Code decides**, then Caleb playtests.
- Dodge details (duration, invulnerability, any limit) are **Claude Code decides**.

### Characters
Six characters, one per archetype. Characters differ in moves, weight, move speed and jump height. Duplicates are allowed in a match, with a slight palette change for the second.

| Name | Archetype | Color | Strengths | Weaknesses |
|---|---|---|---|---|
| Fisticuffs | Rushdown | Red | Good mobility, aggressive tools | Light, poor neutral (struggles to approach) |
| Spartan | Swordfighter | Blue | Great range, coverage and disjoints | Not very mobile, relies on stray hits for damage |
| Ranger | Zoner | Green | Average mobility and survivability, plenty of ranged tools | Less effective close up, needs precision to use well |
| Buster | Heavyweight | Yellow | Great survivability and damage, decent neutral | Low speed, easily comboed |
| Phantom | Hit and Run | Purple | Excellent mobility, safe moves | Inconsistent damage and kill power, poor survivability and defense |
| Valkyrie | Aerial Ace | Teal (**Claude Code decides**) | 4 jumps, stronger aerials over ground moves, great air mobility | Poor ground mobility, poor move range |

Per-character constraints:
- **Fisticuffs:** short range, punchy, has combos.
- **Spartan:** a comically large sword. Has a projectile move, such as throwing the sword.
- **Ranger:** an archer, with many attacks that shoot a bow. Ranger still needs some answer to opponents who get close (**Claude Code decides**).
- **Buster:** large (sprite and hurtbox) with slow frame data, and armor on some moves.
- **Phantom:** plenty of movement and poking moves. The sprite should have agile hurtbox shifting, which is a deliberate animation and collision detail and should not be left to default hitboxes.
- **Valkyrie:** a small build with wings. Has 4 jumps. Uses a sword, with poor move range. An emphasis on vertical combos.

### Stages
- Five stages. Each has a flat base. Four have some arrangement of 1-4 platforms, and one is the flat base only.
- Stage layouts and names are **Claude Code decides**.
- Stage vote: each player picks a stage from the list. If their picks differ, the game picks randomly between the two picked stages. "Random" is a separate button that counts as a vote for a randomly chosen stage from the whole list.

## Pazaak

- Rules: KOTOR II rules. Claude Code should read the sources listed below for the complete rules.
- Rules summary (verify against sources):
  - A 40-card main deck of four of each card numbered 1 through 10.
  - Each player's side deck has 10 cards. Each player's hand is 4 cards drawn at random from their side deck.
  - The aim is to get closest to 20 without going over.
  - The first player to win 3 sets wins the match.
  - Filling the table is an automatic win condition in KOTOR II.
- Side deck building: players pick 10 cards from a fixed pool, or choose "random," which fills all 10 slots from the pool. Up to 2 copies of each card per deck.
- Card pool (19 cards):
  - Plain cards: +1 through +6 and -1 through -6 (12 cards).
  - Flip cards (marked ±): ±1 through ±6 (6 cards).
  - Tiebreaker: ±1T (1 card).
  - Not in the pool: the 2&4 and 3&6 cards, the double card, the 1±2 card, and any other KOTOR II special cards.
- Turn timer: 5 seconds. When it runs out, the turn ends and play continues (it does not stand).
- Nothing is saved. A player's deck choice is not stored between sessions.
- On phone, Pazaak supports both portrait and landscape.

## Settings, audio and look

- Settings are quality-of-life options, such as screen brightness and audio volume. The exact list is **Claude Code decides**.
- Audio is in scope and should be simple.
- Same color scheme and visual style as the new shop manual, with stick-figure art and a more gamey feel than the shop manual.

## Technical constraints (research findings, not decisions)

These findings were gathered while checking feasibility. Verify current limits before relying on them, since free-tier terms change.

Hosting:
- GitHub Pages: published site no larger than 1 GB, soft bandwidth limit of 100 GB per month. This is shared by all art and audio on the site.

Platfighter networking:
- The fighter is real-time and needs a low-latency approach.
- Supabase Realtime free plan: 200 concurrent connections and 100 messages per second, where a message counts both when sent and when delivered. Relaying one input message per frame at 60 fps exceeds this for a single 2-player match, so relaying per-frame play through Supabase is not viable on the free plan.
- Peer-to-peer over WebRTC with rollback netcode keeps game data off any server, so free-plan message limits do not apply. It needs:
  - A signaling service so players can connect using a room code.
  - Optionally a TURN relay for players whose networks block direct connections. PeerJS's server only does signaling, and symmetric NATs still need TURN.
- Free options found, with current terms to be verified:
  - NetplayJS: P2P WebRTC with rollback netcode. Its games can be static HTML hosted on GitHub Pages. Its matchmaking/signaling server can be self-hosted or the public instance used.
  - rollback-netcode (npm): TypeScript P2P rollback library over WebRTC, listing 4+ player support, with a signaling server needed.
  - PeerJS Cloud: free signaling by default. One older source states a 50 concurrent connection limit on the free tier, which needs checking.
  - Cloudflare Workers with Durable Objects for self-built signaling. Current pricing lists a free plan limited to SQLite-backed Durable Objects, but one older page says Durable Objects are paid-only. Verify.
  - Cloudflare TURN: first 1,000 GB per month free, then $0.05 per GB. Cloudflare's STUN is free.
- Rollback requires the game state to be serializable so it can be rewound and replayed, plus a fixed timestep. Games that cannot be rewound would have to use lockstep netcode instead. Everything in the match must live in that state, including projectiles, armor status, damage, stocks and the once-per-air up special. Write the 2-player build with a fixed timestep and serializable state from the start, so adding 3-4 players is mostly a networking change.
- Rollback is mostly used for 1v1. More players mean more mispredictions and more corrections. Expect 3-4 player online play to feel worse than 2-player. NetplayJS has an open issue titled "Support >2 Players", and its current status was not confirmed.
- Phone and computer players in the same match means the simulation must not depend on frame rate or input device.

Pazaak networking:
- Turn-based, so it sends a few small messages per turn. Well within free limits, and it can reuse whatever room-code and signaling setup the fighter uses.

## Out of scope

- Same-device multiplayer.
- Matchmaking with strangers, accounts, ranked play.
- Saving and progression of any kind.
- Public release.
- The platformer roguelike idea (set aside).

## Open items

None. Everything not decided above has been explicitly delegated to Claude Code (marked **Claude Code decides**).

## Sources

- NetplayJS: https://github.com/rameshvarun/netplayjs
- rollback-netcode: https://github.com/someusername6/rollback-netcode
- PeerJS docs: https://peerjs.com/client/faq and https://peerjs.com/server/getting-started
- Supabase Realtime limits: https://supabase.com/docs/guides/realtime/limits
- Cloudflare Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing
- Cloudflare Realtime TURN: https://developers.cloudflare.com/realtime/turn/faq/
- GitHub Pages limits: https://docs.github.com/pages/getting-started-with-github-pages/github-pages-limits
- Pazaak (KOTOR II rules): https://strategywiki.org/wiki/Star_Wars_Knights_of_the_Old_Republic_II:_The_Sith_Lords/Pazaak
- Pazaak (KOTOR rules): https://strategywiki.org/wiki/Star_Wars:_Knights_of_the_Old_Republic/Pazaak
