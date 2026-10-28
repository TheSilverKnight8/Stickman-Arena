# The five fighters and their 12 moves

Each fighter has 8 normal attacks (neutral, up, down and side, on the ground and in the air) and 4 specials (the same on the ground and in the air). The direction held when pressing Attack or Special picks the move.

Numbers come straight from `src/fighter/sim/chars/`. **Starts** is the first frame that can hit (60 frames = 1 second); **Ends** is when the fighter can act again; **Damage** is the most a single hit does (multi-hit moves list the hit count). These are first-pass values for playtesting.

Shared by everyone: a double jump (once per jump, back on landing); a spot dodge on the ground or in the air (cannot be hit for most of it; the air dodge works once per jump); tap down in the air to fall faster; hold down on a platform to drop through. The up special can be used once in the air and comes back on landing; other specials have no limit.

## Fisticuffs — Rushdown

Rushdown. Short reach and quick punches that lead into each other. Light, so Fisticuffs flies early.

Weight 85 · run speed 7.2 · air speed 4.8 · jump 14.2 / double jump 13 · gravity 0.62 · fall speed 10.5 (fast fall 15)

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **One-Two** — A quick left, and pressing attack again throws a right (two hits). Keeps the opponent close. | 3 | 16 | 3 | press again for the second punch |
| Side (ground) | **Straight Punch** — Steps in with a straight punch. | 8 | 28 | 8 |  |
| Up (ground) | **Uppercut** — Uppercut that pops the opponent up for air follow-ups. | 6 | 24 | 6 |  |
| Down (ground) | **Low Sweep** — Low sweeping kick that pops the opponent up. | 5 | 20 | 5 |  |
| Neutral (air) | **Spin Kick** — Legs split, spinning. Strong at the start, weaker as it lingers. | 4 | 30 | 8 | landing lag 7 |
| Side (air) | **Double Jab** — Two punches in the air, the second one launches. | 4 | 30 | 6 | landing lag 9 |
| Up (air) | **Flip Kick** — Backflip kick for juggling. | 6 | 28 | 7 | landing lag 8 |
| Down (air) | **Stomp** — Stomp. The first frames spike the opponent downward. | 11 | 36 | 10 | landing lag 14; spikes |
| Neutral special | **Haymaker** — Winds up, steps in and throws a heavy punch. The best KO move Fisticuffs has. | 18 | 48 | 16 |  |
| Side special | **Dash Punch** — Lunges forward fist-first (also useful for getting back to the stage). Stops when it hits. | 8 | 36 | 9 |  |
| Up special | **Rising Uppercut** — Spins upward hitting several times, then a final launching hit. The recovery move. | 6 | 42 | 5 | 4+ hits of 2 |
| Down special | **Stomp Drop** — Hops if on the ground, then drops straight down feet-first (spikes in the air) and pops nearby opponents up on landing. | 10 | 12 + 18 on landing | 9 | falls until landing; spikes |

## Spartan — Swordfighter

Swordfighter. The comically large sword is not part of Spartan's hurtbox, so it out-ranges most attacks. Slow on foot.

Weight 108 · run speed 5 · air speed 3.6 · jump 13 / double jump 12 · gravity 0.58 · fall speed 10 (fast fall 14.5) · projectile limit 1

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Sword Poke** — Sword poke straight ahead. | 6 | 22 | 7 | needs the sword in hand |
| Side (ground) | **Wide Slash** — Wide horizontal slash, back to front. The tip hits harder. | 8 | 36 | 13 | needs the sword in hand |
| Up (ground) | **Overhead Arc** — Swings the sword in an arc overhead, front to back. | 8 | 34 | 10 | needs the sword in hand |
| Down (ground) | **Low Sweep** — A crouching sweep of the sword along the floor. | 8 | 30 | 9 | needs the sword in hand |
| Neutral (air) | **Sword Spin** — Spins the sword all the way around the body. | 7 | 38 | 9 | landing lag 10; needs the sword in hand |
| Side (air) | **Arc Chop** — Chops from overhead down in front. | 10 | 38 | 13 | landing lag 12; needs the sword in hand |
| Up (air) | **Sky Arc** — Swings the sword overhead in the air. | 8 | 34 | 11 | landing lag 10; needs the sword in hand |
| Down (air) | **Plunge** — Plunges the sword straight down. The tip spikes. | 9 | 40 | 13 | landing lag 16; needs the sword in hand; spikes |
| Neutral special | **Grand Slash** — A slow, huge overhead slam. Spartan's strongest hit. | 21 | 58 | 19 | needs the sword in hand |
| Side special | **Sword Throw** — The projectile. The sword spins out and comes back like a boomerang, hitting on the way out and again on the way back. Until Spartan catches it, attacks that need the sword cannot be used (moving, jumping, dodging and Rising Slash still work). | 12 | 30 | 8 | projectile (sword); needs the sword in hand |
| Up special | **Rising Slash** — Rises spinning with the sword up, several hits then a launcher. Shorter than most recoveries. | 7 | 42 | 6 | 3+ hits of 3 |
| Down special | **Deflect** — Twirls the sword in front. Sends arrows, orbs and boulders back at their thrower (reflect), harder and faster. | 4 | 30 | 4 | reflects frames 3–20; needs the sword in hand |

## Ranger — Zoner

Zoner. Most attacks fire the bow. Up close, Ranger pushes opponents away with the Bow Bash and two kicks.

Weight 98 · run speed 6 · air speed 4.2 · jump 13.5 / double jump 12.5 · gravity 0.55 · fall speed 9.5 (fast fall 14) · projectile limit 5

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Bow Bash** — Swings the bow at close range (an answer to opponents who get close). | 4 | 18 | 4 |  |
| Side (ground) | **Quick Shot** — Fires an arrow straight ahead. | 10 | 26 | 6 | projectile (arrow) |
| Up (ground) | **Skyward Shot** — Fires an arrow upward. | 9 | 26 | 6 | projectile (arrow) |
| Down (ground) | **Back-off Kick** — Low kick that pushes the opponent away and slides Ranger back. | 4 | 24 | 6 |  |
| Neutral (air) | **Bow Spin** — Spins with the bow out (close-range answer in the air). | 5 | 28 | 6 | landing lag 7 |
| Side (air) | **Air Shot** — Fires an arrow ahead in the air, with a little recoil. | 9 | 28 | 5 | projectile (arrow); landing lag 8 |
| Up (air) | **Up Shot** — Fires an arrow straight up in the air. | 8 | 26 | 5 | projectile (arrow); landing lag 7 |
| Down (air) | **Dive Shot** — Fires an arrow down and forward, with a small hop upward. | 9 | 30 | 6 | projectile (arrow); landing lag 9 |
| Neutral special | **Charged Shot** — Hold special to draw the bow (up to about a second), let go to fire. Faster, stronger arrows the longer it is held. | 13 | 36 | 7 | projectile (arrow); hold to charge up to 50 frames |
| Side special | **Triple Shot** — Three arrows in a spread. | 14 | 38 | 4 | projectile (arrow) |
| Up special | **Rocket Arrow** — Fires an arrow straight down and rides the push upward. The recovery move. | 7 | 34 | 7 | projectile (arrow) |
| Down special | **Backflip Kick** — Kicks the opponent away and backflips out (a close-range escape). | 3 | 32 | 8 |  |

## Buster — Heavyweight

Heavyweight. Big, slow, hits very hard and survives long. Falls fast, so Buster is easy to combo. Armor on four moves.

Weight 130 · run speed 4.4 · air speed 3.3 · jump 13.2 / double jump 12 · gravity 0.7 · fall speed 11.5 (fast fall 16) · projectile limit 1 · armor holds against knockback under 100

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Palm Shove** — Palm Shove with both hands. | 9 | 30 | 9 |  |
| Side (ground) | **Hammer Fist** — Raises both fists and slams them forward. Armored while winding up. | 14 | 44 | 15 | armor frames 6–16 |
| Up (ground) | **Overhead Clap** — Claps both hands together overhead. | 12 | 40 | 13 |  |
| Down (ground) | **Ground Punch** — Punches the floor in front. | 12 | 38 | 12 |  |
| Neutral (air) | **Body Spin** — Body Spin with both arms out. | 10 | 40 | 11 | landing lag 14 |
| Side (air) | **Double Slam** — Both fists down in front. The fists spike; the arms launch. | 16 | 46 | 17 | landing lag 18; spikes |
| Up (air) | **Headbutt** — Headbutt upward. | 11 | 38 | 14 | landing lag 12 |
| Down (air) | **Drill Stomp** — Both feet down, spikes. | 14 | 44 | 15 | landing lag 18; spikes |
| Neutral special | **Boulder Lob** — The projectile. Throws a heavy boulder in an arc; it breaks on the stage. One at a time. | 20 | 46 | 16 | projectile (boulder) |
| Side special | **Charging Tackle** — An armored shoulder charge. Stops when it hits. | 8 | 52 | 12 | armor frames 5–30 |
| Up special | **Rocket Leap** — Armored crouch, then a big jump with fists up. The recovery move. | 10 | 50 | 13 | armor frames 1–10 |
| Down special | **Ground Pound** — Hops if on the ground, then plummets (armored, spikes in the air); landing sends shockwaves along the floor both ways. | 12 | 14 + 26 on landing | 14 | armor frames 6–12; falls until landing; spikes |

## Phantom — Hit and Run

Hit and run. The fastest and highest-jumping fighter, with quick, safe pokes and low damage. Light and thin: the poses pull the body away while a limb reaches out (agile hurtbox shifting), and Phantom's limbs are thinner targets than anyone else's.

Weight 78 · run speed 8 · air speed 5.2 · jump 14.5 / double jump 14 · gravity 0.5 · fall speed 9 (fast fall 13) · projectile limit 1

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Quick Poke** — The arm shoots out while the body leans back. | 2 | 12 | 3 |  |
| Side (ground) | **Lunge Poke** — A long low lunge forward. | 6 | 24 | 7 |  |
| Up (ground) | **Arc Kick** — Arches backward under a kick that sweeps overhead. | 4 | 22 | 6 |  |
| Down (ground) | **Slide** — Drops almost flat and slides feet-first, popping the opponent up. | 4 | 26 | 6 |  |
| Neutral (air) | **Whirl** — A quick spin. | 4 | 22 | 5 | landing lag 5 |
| Side (air) | **Air Lunge** — Stretches forward with a poke; the fingertips hit harder. | 6 | 24 | 8 | landing lag 6 |
| Up (air) | **Scissor Kick** — Both legs scissor overhead. | 4 | 22 | 6 | landing lag 5 |
| Down (air) | **Dive Kick** — Dives diagonally down feet-first (movement). | 6 | 28 | 7 | landing lag 8 |
| Neutral special | **Phantom Orb** — The projectile. A slow orb drifts forward. One at a time; it fades if Phantom is hit. | 10 | 28 | 6 | projectile (orb) |
| Side special | **Blink Strike** — A fast dash; cannot be hit for the first few frames. | 6 | 30 | 7 | can't be hit frames 2–7 |
| Up special | **Phase Rise** — Vanishes and reappears up to about two body-lengths away in any held direction (straight up if none). Cannot be hit while vanished. The recovery move. | 13 | 32 | 5 | can't be hit frames 3–14 |
| Down special | **Recoil Kick** — Kicks forward and bounces back away (hit and run). | 4 | 28 | 8 |  |

