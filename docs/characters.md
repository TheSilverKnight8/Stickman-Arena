# The five fighters and their 12 moves

Each fighter has 8 normal attacks (neutral, up, down and side, on the ground and in the air) and 4 specials (the same on the ground and in the air). The direction held when pressing Attack or Special picks the move.

Numbers come straight from `src/fighter/sim/chars/`. **Starts** is the first frame that can hit (60 frames = 1 second); **Ends** is when the fighter can act again; **Damage** is the most a single hit does (multi-hit moves list the hit count). These are first-pass values for playtesting.

Shared by everyone: a double jump (once per jump, back on landing); a spot dodge on the ground or in the air (cannot be hit for most of it; the air dodge works once per jump); tap down in the air to fall faster; hold down on a platform to drop through. The up special can be used once in the air and comes back on landing or when hit; other specials have no limit. An aerial that lands before its hit is over keeps going on the ground for up to 8 frames, so it still hits, then the landing lag starts.

## Fisticuffs — Rushdown

Rushdown. Short reach and quick punches that lead into each other. Light, so Fisticuffs flies early.

Weight 85 · run speed 7.2 · air speed 4.8 · jump 13.6 / double jump 12.5 · gravity 0.53 · fall speed 9.5 (fast fall 15)

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **One-Two** — A quick left, and pressing attack again throws a right (two hits). Keeps the opponent close. | 3 | 16 | 4 | press again for the second punch |
| Side (ground) | **Straight Punch** — Steps in with a straight punch. | 8 | 28 | 8 |  |
| Up (ground) | **Uppercut** — Uppercut that pops the opponent up for air follow-ups. | 6 | 24 | 8 |  |
| Down (ground) | **Low Sweep** — Low sweeping kick that pops the opponent up. | 5 | 20 | 7 |  |
| Neutral (air) | **Spin Kick** — Legs split, spinning. Strong at the start, weaker as it lingers. | 4 | 30 | 8 | landing lag 7 |
| Side (air) | **Double Jab** — Two punches in the air, the second one launches. | 4 | 30 | 8 | landing lag 9 |
| Up (air) | **Flip Kick** — Backflip kick for juggling. | 6 | 28 | 9 | landing lag 8 |
| Down (air) | **Stomp** — Stomp. The first frames spike the opponent downward. | 11 | 36 | 10 | landing lag 14; spikes |
| Neutral special | **Haymaker** — Winds up, steps in and throws a heavy punch. The best KO move Fisticuffs has. | 18 | 48 | 16 |  |
| Side special | **Dash Punch** — Lunges forward fist-first (also useful for getting back to the stage). Stops when it hits. | 8 | 36 | 9 |  |
| Up special | **Rising Uppercut** — Spins upward hitting several times, then a final launching hit. The recovery move. | 6 | 42 | 5 | 4+ hits of 2 |
| Down special | **Stomp Drop** — Hops if on the ground, then drops straight down feet-first (spikes in the air) and pops nearby opponents up on landing. | 10 | 12 + 18 on landing | 9 | falls until landing; spikes |

## Spartan — Swordfighter

Swordfighter. The comically large sword is not part of Spartan's hurtbox, so it out-ranges most attacks. Slow on foot.

Weight 108 · run speed 5 · air speed 3.6 · jump 12.5 / double jump 11.5 · gravity 0.49 · fall speed 9 (fast fall 14.5) · projectile limit 1

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Sword Poke** — Sword poke straight ahead. | 6 | 22 | 7 | needs the sword in hand |
| Side (ground) | **Lunging Thrust** — A precise thrust: the sword draws back level at chest height, then drives straight forward. Hits along the blade at that one height for 3 frames; the tip hits harder. | 9 | 36 | 13 | needs the sword in hand |
| Up (ground) | **Overhead Arc** — Swings the sword in an arc overhead, front to back. | 8 | 34 | 10 | needs the sword in hand |
| Down (ground) | **Low Thrust** — A low thrust: crouched, the sword draws back level near the floor, then stabs straight forward. The tip hits harder. | 8 | 30 | 9 | needs the sword in hand |
| Neutral (air) | **Sword Spin** — Spins the sword all the way around the body. | 7 | 38 | 9 | landing lag 10; needs the sword in hand |
| Side (air) | **Arc Chop** — Chops from overhead down in front. | 10 | 38 | 13 | landing lag 12; needs the sword in hand |
| Up (air) | **Sky Arc** — Swings the sword overhead in the air. | 8 | 34 | 11 | landing lag 10; needs the sword in hand |
| Down (air) | **Plunge** — Plunges the sword straight down. The tip spikes. | 9 | 40 | 13 | landing lag 16; needs the sword in hand; spikes |
| Neutral special | **Grand Slash** — A slow, huge overhead slam. Spartan's strongest hit. | 21 | 58 | 19 | needs the sword in hand |
| Side special | **Sword Throw** — The projectile. A stab throw aimed 30 degrees upward: the sword flies straight out along that line point first, slows down, and comes straight back along the same line, hitting on the way out and again on the way back. Spartan catches it when it reaches the hand; if Spartan has moved off its line (in the air, say), it flies on and is back in hand once it is gone. Until then, attacks that need the sword cannot be used (moving, jumping, dodging and Rising Slash still work). | 12 | 30 | 8 | projectile (sword); needs the sword in hand |
| Up special | **Rising Slash** — Rises spinning with the sword up, several hits then a launcher. Shorter than most recoveries. | 7 | 42 | 6 | 3+ hits of 3 |
| Down special | **Deflect** — Twirls the sword in front. Sends arrows, orbs and boulders back at their thrower (reflect), harder and faster. | 4 | 30 | 4 | reflects frames 3–20; needs the sword in hand |

## Ranger — Zoner

Zoner. Most attacks fire the bow. Arrows push opponents back but stun them only briefly (40% of the usual hitstun). Up close, Ranger pushes opponents away with the Bow Bash and two kicks.

Weight 98 · run speed 6 · air speed 4.2 · jump 13 / double jump 12 · gravity 0.47 · fall speed 8.6 (fast fall 14) · projectile limit 5

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Bow Bash** — Swings the bow at close range (an answer to opponents who get close). | 4 | 18 | 4 |  |
| Side (ground) | **Quick Shot** — Fires an arrow straight ahead. | 10 | 34 | 6 | projectile (arrow) |
| Up (ground) | **Skyward Shot** — Fires an arrow upward. | 9 | 34 | 6 | projectile (arrow) |
| Down (ground) | **Back-off Kick** — Low kick that pushes the opponent away and slides Ranger back. | 4 | 24 | 6 |  |
| Neutral (air) | **Bow Spin** — Spins with the bow out (close-range answer in the air). | 5 | 28 | 6 | landing lag 7 |
| Side (air) | **Air Shot** — Fires an arrow ahead in the air, with a little recoil. | 9 | 36 | 5 | projectile (arrow); landing lag 8 |
| Up (air) | **Up Shot** — Fires an arrow straight up in the air. | 8 | 34 | 5 | projectile (arrow); landing lag 7 |
| Down (air) | **Dive Shot** — Fires an arrow down and forward, with a small hop upward. | 9 | 38 | 6 | projectile (arrow); landing lag 9 |
| Neutral special | **Charged Shot** — Hold special to draw the bow (up to about a second), let go to fire. Faster, stronger arrows the longer it is held. | 13 | 46 | 7 | projectile (arrow); hold to charge up to 50 frames |
| Side special | **Triple Shot** — Three arrows in a spread. | 14 | 48 | 4 | projectile (arrow) |
| Up special | **Rocket Arrow** — Fires an arrow straight down and rides the push upward. The recovery move. | 7 | 34 | 7 | projectile (arrow) |
| Down special | **Backflip Kick** — Kicks the opponent away and backflips out (a close-range escape). | 3 | 32 | 8 |  |

## Buster — Heavyweight

Heavyweight. Big, slow, hits very hard and survives long. Falls fast, so Buster is easy to combo. No armor; instead Buster takes 15% less knockback while standing on the ground.

Weight 130 · run speed 4.8 · air speed 3.6 · jump 12.7 / double jump 11.5 · gravity 0.59 · fall speed 10.3 (fast fall 16) · projectile limit 1 · takes 15% less knockback while standing on the ground

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Palm Shove** — Palm Shove with both hands. | 9 | 30 | 9 |  |
| Side (ground) | **Hammer Fist** — Raises both fists and slams them forward. | 18 | 50 | 15 |  |
| Up (ground) | **Overhead Clap** — Claps both hands together overhead. | 12 | 40 | 13 |  |
| Down (ground) | **Ground Punch** — Punches the floor in front. | 12 | 38 | 12 |  |
| Neutral (air) | **Body Spin** — Body Spin with both arms out. | 10 | 40 | 11 | landing lag 14 |
| Side (air) | **Double Slam** — Both fists down in front. The fists spike; the arms launch. | 16 | 46 | 17 | landing lag 18; spikes |
| Up (air) | **Headbutt** — Headbutt upward. | 11 | 38 | 14 | landing lag 12 |
| Down (air) | **Drill Stomp** — Both feet down, spikes. | 14 | 44 | 15 | landing lag 18; spikes |
| Neutral special | **Boulder Roll** — The projectile. Bowls a boulder underhand: it rolls slowly along the floor (or drops to it first if thrown in the air), rolls off ledges, and breaks when it hits someone. Small enough to jump over. One at a time. | 20 | 46 | 12 | projectile (boulder) |
| Side special | **Charging Tackle** — A shoulder charge. Stops when it hits. | 8 | 52 | 12 |  |
| Up special | **Rocket Leap** — A crouch, then a blast around his feet just before a big jump with fists up (on the ground or in the air). The recovery move. Only the blast hits; nothing on the way up. | 7 | 50 | 13 |  |
| Down special | **Ground Pound** — Hops if on the ground, then plummets (spikes in the air); landing sends shockwaves along the floor both ways. | 12 | 14 + 26 on landing | 14 | falls until landing; spikes |

## Phantom — Hit and Run

Hit and run. The fastest and highest-jumping fighter, with quick, safe pokes and low damage. Light and thin: the poses pull the body away while a limb reaches out (agile hurtbox shifting), and Phantom's limbs are thinner targets than anyone else's.

Weight 78 · run speed 8 · air speed 5.2 · jump 13.9 / double jump 13.4 · gravity 0.42 · fall speed 8.1 (fast fall 13) · projectile limit 2

| Input | Move | Starts | Ends | Damage | Notes |
| --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Quick Poke** — The arm shoots out while the body leans back. | 2 | 10 | 4 |  |
| Side (ground) | **Lunge Poke** — A long low lunge forward. | 6 | 20 | 9 |  |
| Up (ground) | **Arc Kick** — Arches backward under a kick that sweeps overhead. | 4 | 18 | 8 |  |
| Down (ground) | **Slide** — Drops almost flat and slides feet-first, popping the opponent up. | 4 | 22 | 8 |  |
| Neutral (air) | **Whirl** — A quick spin that pulls opponents in toward Phantom (and a little up), to set up a follow-up on stage or off it. | 4 | 18 | 6 | landing lag 4 |
| Side (air) | **Air Lunge** — Stretches forward with a poke; the fingertips hit harder. | 6 | 20 | 10 | landing lag 4 |
| Up (air) | **Scissor Kick** — Both legs scissor overhead. | 4 | 18 | 8 | landing lag 4 |
| Down (air) | **Hover Stomp** — Hovers a moment with the knees tucked, then stomps both feet straight down. The first two frames of the stomp spike (send straight down), for finishing opponents offstage; it does not drop Phantom. | 8 | 25 | 10 | landing lag 6; spikes |
| Neutral special | **Phantom Orb** — The projectile. An orb flies forward. Two at a time; they fade if Phantom is hit. | 10 | 23 | 8 | projectile (orb) |
| Side special | **Blink Strike** — A fast dash; cannot be hit for the first few frames. | 6 | 25 | 9 | can't be hit frames 2–7 |
| Up special | **Phase Rise** — Vanishes and reappears up to about two and a half body-lengths away in any held direction (straight up if none). Cannot be hit while vanished. The recovery move. | 13 | 27 | 5 | can't be hit frames 3–14 |
| Down special | **Reaper Kick** — The kill move. The knee comes up, then the heel drives straight out while Phantom leans far back. The heel is the strongest hit (KOs a mid-weight at about 100% in the middle of the stage); the rest of the leg launches too. Slow to start, so it needs a read or a set-up. | 13 | 36 | 15 |  |

