# The six fighters and their 12 moves

Each fighter has 8 normal attacks (neutral, up, down and side, on the ground and in the air) and 4 specials (the same on the ground and in the air). The direction held when pressing Attack or Special picks the move.

Numbers come straight from `src/fighter/sim/chars/`. **Starts** is the first frame that can hit (60 frames = 1 second); **Ends** is when the fighter can act again; **Damage** is the most a single hit does (multi-hit moves list the hit count; a command grab shows its throw). **Priority** is light, medium or heavy (see below). These are first-pass values for playtesting.

Priority (Caleb's rule): when two attacks touch, the higher priority beats the lower (the lower move stops and its fighter is pushed back for a moment) and even ones trade (both carry on). A projectile touching an attack: a higher or even attack swats it away and carries on; a lower one is stopped and the projectile flies on. Two projectiles: the higher destroys the lower, even ones destroy each other. Command grabs never clash.

Shared by everyone: a double jump (once per jump, back on landing; Valkyrie gets three jumps in the air instead of one); a spot dodge on the ground or in the air (cannot be hit for most of it; the air dodge works once per jump); tap down in the air to fall faster; hold down on a platform to drop through. The up special can be used once in the air and comes back on landing or when hit; other specials have no limit. An aerial that lands before its hit is over keeps going on the ground for up to 8 frames, so it still hits, then the landing lag starts.

## Fisticuffs — Rushdown

Rushdown. Short reach, with quick punches and kicks that lead into each other. Light, so Fisticuffs flies early.

Weight 85 · run speed 7.2 · air speed 4.8 · jump 14.6 / double jump 13.4 · gravity 0.53 · fall speed 9.5 (fast fall 15)

| Input | Move | Starts | Ends | Damage | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **One-Two** — A quick left, and pressing attack again throws a right (two hits; a press made during the first punch's hit still counts). Keeps the opponent close. | 3 | 16 | 4 | light | press again for the second punch |
| Side (ground) | **Straight Punch** — Steps in with a straight punch. | 8 | 28 | 8 | medium |  |
| Up (ground) | **Uppercut** — Dips, steps in and swings the fist up from low in front to overhead. Reaches further forward than a plain uppercut, and pops the opponent up to just above him (pulled in a little). | 5 | 24 | 8 | medium |  |
| Down (ground) | **Low Sweep** — Low sweeping kick that pops the opponent up. | 5 | 20 | 7 | light |  |
| Neutral (air) | **Flying Kick** — A sex kick: one leg snaps straight out and stays there. Strong as it comes out, weaker as it lingers. | 3 | 30 | 9 | medium | landing lag 6 |
| Side (air) | **Kick Flurry** — A flurry of kicks out in front (small hits that knock lightly forward and draw the opponent back in, holding them), then a last kick that launches up and forward. | 5 | 32 | 6 | light | 4+ hits of 2; landing lag 9 |
| Up (air) | **Sky Kick** — Leans back and kicks straight up. | 5 | 28 | 9 | medium | landing lag 7 |
| Down (air) | **Spike Punch** — Punches straight down. The fist spikes (sends straight down) at first; later it knocks away. | 9 | 34 | 10 | medium | landing lag 13; spikes |
| Neutral special | **Haymaker** — Winds up, steps in and throws a heavy punch; the fist catches fire. The best KO move Fisticuffs has. | 18 | 48 | 16 | heavy |  |
| Side special | **Dash Punch** — Lunges forward fist-first (also useful for getting back to the stage). Stops when it hits. | 12 | 46 | 9 | medium |  |
| Up special | **Jumping Uppercut** — A strong jumping uppercut: hardest as it leaves the ground (KOs a mid-weight at about 170% in the middle of the stage), weaker on the way up. The recovery move. | 5 | 42 | 11 | medium |  |
| Down special | **Stomp Drop** — Hops if on the ground, then drops straight down feet-first (spikes in the air; an opponent standing on the ground is held instead) and pops nearby opponents up on landing. | 10 | 12 + 18 on landing | 9 | medium | holds a standing opponent for the landing hit; falls until landing; spikes |

## Spartan — Swordfighter

Swordfighter. The comically large sword is not part of Spartan's hurtbox, so it out-ranges most attacks. Slow on foot.

Weight 108 · run speed 5 · air speed 3.6 · jump 13.4 / double jump 12.3 · gravity 0.49 · fall speed 9 (fast fall 14.5) · projectile limit 1

| Input | Move | Starts | Ends | Damage | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Sword Poke** — Steps in with a sword poke straight ahead. | 6 | 22 | 7 | light | needs the sword in hand |
| Side (ground) | **Level Sweep** — A level side swing: the blade sweeps around from behind him at chest height (it looks shorter as it turns toward the viewer) and hits at full length in front, at that one height. | 9 | 36 | 12 | medium | needs the sword in hand |
| Up (ground) | **Overhead Arc** — Swings the sword in an arc overhead, front to back. | 8 | 34 | 10 | medium | needs the sword in hand |
| Down (ground) | **Floor Scoop** — Crouched low, the blade sweeps around along the floor to the front, then scoops up, popping the opponent up. | 9 | 32 | 9 | medium | needs the sword in hand |
| Neutral (air) | **Sword Spin** — Spins the sword all the way around the body. | 7 | 38 | 9 | medium | landing lag 10; needs the sword in hand |
| Side (air) | **Arc Chop** — Chops from overhead down in front. | 10 | 38 | 13 | heavy | landing lag 12; needs the sword in hand |
| Up (air) | **Blade Lift** — Like Cloud's up air: the sword held level and lifted from chest height to over his head. Wide, with little reach upward; low enough at the start to catch opponents standing beside him. | 5 | 30 | 10 | medium | landing lag 8; needs the sword in hand |
| Down (air) | **Plunge** — Plunges the sword straight down. The tip spikes. | 9 | 40 | 13 | heavy | landing lag 16; needs the sword in hand; spikes |
| Neutral special | **Grand Slash** — A slow, huge overhead slam. Spartan's strongest hit. | 21 | 58 | 19 | heavy | needs the sword in hand |
| Side special | **Sword Throw** — The projectile. A stab throw aimed 30 degrees upward: the sword flies straight out along that line point first, slows down, and comes straight back along the same line, hitting on the way out and again on the way back. Spartan catches it when it reaches the hand; if Spartan has moved off its line (in the air, say), it flies on and is back in hand once it is gone. Until then, attacks that need the sword cannot be used. | 12 | 30 | 8 | medium | projectile (sword); needs the sword in hand |
| Up special | **Sky Toss** — Like Ike's Aether: tosses the sword straight up (it hits on the way up, knocking the opponent up and a little forward into the plunge), leaps after it and catches it, then flips and plunges straight down sword first, dragging opponents down into the landing hit (he can catch the ledge on the way), and hits again on landing. Without the sword in hand (thrown), he leaps without the toss. He holds completely still until the leap, and has super armor (takes damage but never flinches) from the start until he catches the sword. The recovery move. | 6 | 44 + 24 on landing | 6 | medium | projectile (toss); super armor frames 1–28; holds still frames 1–12; falls until landing; spikes |
| Down special | **Deflect** — Twirls the sword in front. Sends arrows, orbs and boulders back at their thrower (reflect), harder and faster. | 4 | 30 | 4 | light | reflects frames 3–20; needs the sword in hand |

## Ranger — Zoner

Zoner. Her specials shoot the bow (and one throws a bomb); her tilts and aerials are melee (Caleb's change after the CPU study): the bow, kicks, and a dagger drawn in her back hand. Arrows push opponents back but stun them only briefly (40% of the usual hitstun).

Weight 98 · run speed 6 · air speed 4.2 · jump 13.9 / double jump 12.9 · gravity 0.47 · fall speed 8.6 (fast fall 14) · projectile limit 5

| Input | Move | Starts | Ends | Damage | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Bow Bash** — Swings the bow at close range (an answer to opponents who get close). | 4 | 18 | 4 | light |  |
| Side (ground) | **Dagger Slash** — A backhand dagger slash, stepping in. | 5 | 24 | 7 | medium |  |
| Up (ground) | **Dagger Upswing** — Rises out of a crouch sweeping the dagger up from low in front to over her head (an anti-air). | 6 | 26 | 7 | medium |  |
| Down (ground) | **Back-off Kick** — Low kick that pushes the opponent away and slides Ranger back. | 4 | 24 | 6 | light |  |
| Neutral (air) | **Bow Spin** — Spins with the bow out (close-range answer in the air). | 4 | 28 | 7 | light | landing lag 7 |
| Side (air) | **Dagger Stab** — Draws the dagger back and stabs straight ahead, front knee up. | 6 | 28 | 10 | medium | landing lag 6 |
| Up (air) | **Bow Arc** — Swings the bow overhead from in front to behind. Her KO move in the air (a mid-weight at about 150% in the middle of the stage, from below). | 5 | 28 | 11 | medium | landing lag 6 |
| Down (air) | **Dagger Drop** — Raises the dagger and drives it straight down: spikes at first, knocks away after. | 8 | 34 | 10 | medium | landing lag 10; spikes |
| Neutral special | **Charged Shot** — Hold special to draw the bow (up to two thirds of a second), let go to fire. The longer it is held, the faster, stronger and bigger the arrow (up to 2.2 times its size, hitting as big as it looks), with green wind gathering at the bow and trailing the arrow. Hold up or down while drawing (until the arrow leaves) to aim it 45 degrees up or down. | 13 | 46 | 7 | heavy | hold up or down to aim 45°; projectile (arrow); hold to charge up to 40 frames |
| Side special | **Boomerang** — Throws a boomerang with the back hand: it flies out about 230, slows, and curves back to Ranger wherever she is, hitting once on the way out and once on the way back (which pulls toward her). Hold up or down while throwing to aim it 40 degrees up or down. One at a time. | 10 | 34 | 6 | medium | hold up or down to aim 40°; projectile (boomerang) |
| Up special | **Rocket Arrow** — Fires an arrow straight down and rides the push upward. The recovery move. | 7 | 34 | 7 | light | projectile (arrow) |
| Down special | **Fuse Bomb** — Lobs a bomb forward in an arc (it lands about 275 ahead on flat ground). It comes to rest where it lands and goes off a second and a half after the throw, not on contact, throwing everyone near it away from it (KOs a mid-weight at about 120% in the middle of the stage). It never hurts Ranger. One at a time. | 11 | 36 | 14 | medium | projectile (bomb) |

## Buster — Heavyweight

Heavyweight, built like an ape: huge arms, a regular-sized head, hunched over with the knuckles near the floor. Hits very hard and survives long. Falls fast, so Buster is easy to combo. No armor; instead Buster takes 15% less knockback while standing on the ground. Two command grabs, which never clash with attacks.

Weight 130 · run speed 5.2 · air speed 4.2 · jump 14.2 / double jump 12.9 · gravity 0.59 · fall speed 10.3 (fast fall 16) · projectile limit 1 · takes 15% less knockback while standing on the ground

| Input | Move | Starts | Ends | Damage | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Palm Shove** — A two-handed shove, his quickest move (frame 5). | 5 | 24 | 9 | medium |  |
| Side (ground) | **Hammer Fist** — Raises both fists and slams them forward. | 18 | 50 | 15 | heavy |  |
| Up (ground) | **Overhead Clap** — Claps both hands together overhead. | 12 | 40 | 13 | heavy |  |
| Down (ground) | **Suplex** — A command grab low in front. Catching starts the suplex: he lifts the opponent over his head and arches back, slamming them into the floor behind him (KOs a mid-weight at about 190% from the middle of the stage). | 8 | 36 | 12 | – | command grab; throws backward |
| Neutral (air) | **Body Spin** — Spins with both arms out. | 10 | 40 | 11 | medium | landing lag 14 |
| Side (air) | **Double Slam** — Both fists down in front. The fists spike; the arms launch. | 16 | 46 | 17 | heavy | landing lag 18; spikes |
| Up (air) | **Headbutt** — Headbutt upward. | 11 | 38 | 14 | heavy | landing lag 12 |
| Down (air) | **Drill Stomp** — Both feet down, spikes. | 14 | 44 | 15 | heavy | landing lag 18; spikes |
| Neutral special | **Boulder Roll** — The projectile. Bowls a boulder underhand: it rolls slowly along the floor (or drops to it first if thrown in the air), rolls off ledges, and breaks when it hits someone. Small enough to jump over. One at a time. | 20 | 46 | 12 | heavy | projectile (boulder) |
| Side special | **Lunge Grab** — A dashing command grab: lunges forward with both arms out (also useful for getting back to the stage), with super armor through the lunge. Catching swings the opponent up over his head and hurls them behind him (KOs at about 150%). | 9 | 46 | 10 | – | command grab; throws backward; super armor frames 1–22 |
| Up special | **Rocket Leap** — A crouch, then a blast around his feet just before a big jump with fists up (on the ground or in the air). The recovery move. Only the blast hits; nothing on the way up. | 7 | 50 | 13 | heavy |  |
| Down special | **Ground Pound** — Hops if on the ground, then plummets (spikes in the air; an opponent standing on the ground is held instead); landing hits around him and sends shockwaves along the floor both ways. | 12 | 14 + 26 on landing | 14 | heavy | holds a standing opponent for the landing hit; falls until landing; spikes |

## Phantom — Hit and Run

Hit and run. The fastest fighter on foot, with the highest single jumps, quick, safe kicks and low damage. Light and thin: the poses pull the body away while a limb reaches out (agile hurtbox shifting), and Phantom's limbs are thinner targets than anyone else's.

Weight 78 · run speed 8 · air speed 5.2 · jump 14.9 / double jump 14.4 · gravity 0.42 · fall speed 8.1 (fast fall 13) · projectile limit 2

| Input | Move | Starts | Ends | Damage | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Knee Pop** — A quick knee up close while the body sways back. | 2 | 12 | 3 | light |  |
| Side (ground) | **Crescent Kick** — A crescent kick: the leg arcs from behind, over the top and down in front, with a step in. | 6 | 24 | 7 | medium |  |
| Up (ground) | **Arc Kick** — Arches backward under a kick that sweeps overhead. | 4 | 18 | 7 | light |  |
| Down (ground) | **Slide** — Drops almost flat and slides feet-first, popping the opponent up. | 4 | 22 | 7 | light |  |
| Neutral (air) | **Whirl** — A quick spin that pulls opponents in toward Phantom (and a little up), to set up a follow-up on stage or off it. | 4 | 18 | 5 | light | landing lag 4 |
| Side (air) | **Drill Kick** — A drill kick: the body straightens like an arrow and dives feet first, down and forward. Strong as it comes out. | 5 | 24 | 9 | medium | landing lag 6 |
| Up (air) | **Scissor Kick** — Both legs scissor overhead. | 4 | 18 | 7 | light | landing lag 4 |
| Down (air) | **Hover Stomp** — Hovers a moment with the knees tucked, then stomps both feet straight down. The first two frames of the stomp spike (send straight down), for finishing opponents offstage; it does not drop Phantom. | 8 | 25 | 9 | medium | landing lag 6; spikes |
| Neutral special | **Phantom Orb** — The projectile. An orb flies forward: a pressure poke with little damage and knockback but a long stun, so Phantom can follow it up; a long wait after the throw keeps it from being thrown again and again. Two at a time; they fade if Phantom is hit. | 10 | 48 | 4 | medium | projectile (orb) |
| Side special | **Tether Zip** — Throws a ghostly chain forward, up to about 210 away (slightly upward in the air). If it catches an opponent, Phantom zips in with a kick and springs back off them; if it catches a ledge, it reels her in to hang from it. | 5 | 36 | 6 | medium | tether, reaches 210; damage is the kick |
| Up special | **Phase Rise** — Vanishes and reappears up to about two and a half body-lengths away in any held direction (straight up if none). Cannot be hit while vanished. The recovery move. | 13 | 27 | 4 | light | can't be hit frames 3–14 |
| Down special | **Reaper Kick** — The kill move. The knee comes up, then the heel drives straight out while Phantom leans far back. The heel is the strongest hit (KOs a mid-weight at about 100% in the middle of the stage); the rest of the leg launches too. Slow to start, so it needs a read or a set-up. | 13 | 36 | 14 | heavy |  |

## Valkyrie — Aerial Ace

Aerial ace. Four jumps (the jump from the ground and three in the air) and the best air speed, but the slowest on foot and the lightest. Small, with a short sword: the ground moves are quick and short and pop opponents up, and the aerials do the damage and the KOs. The moves use different parts and motions (the hilt, a lunge, the wings, the feet, flips) rather than only sword swipes. The wings are drawn only; they are not part of the hurtbox.

Weight 76 · run speed 4.5 · air speed 5.8 · jump 12.9 / double jump 11.3 (3 in the air) · gravity 0.4 · fall speed 7.6 (fast fall 12)

| Input | Move | Starts | Ends | Damage | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Neutral (ground) | **Pommel Strike** — A quick strike with the hilt, the blade held back. | 2 | 14 | 3 | light |  |
| Side (ground) | **Lunge Stab** — A lunging stab: a long step forward and a straight thrust. | 7 | 26 | 6 | medium |  |
| Up (ground) | **Wing Flare** — Crouches and snaps the wings up: the hit is above her shoulders, not on the sword. Pops opponents straight up with little growth: the start of a juggle. | 5 | 22 | 5 | light |  |
| Down (ground) | **Talon Sweep** — A low sweep with the feet, the body dropped near the floor, popping the opponent up. | 5 | 18 | 4 | light |  |
| Neutral (air) | **Wing Spin** — A full spin with the sword out. Hits all around (the sword and the body), sending away from Valkyrie. | 4 | 30 | 8 | medium | landing lag 8 |
| Side (air) | **Sky Cleave** — A big overhead cleave forward, the whole body following through. The best KO move (a mid-weight at about 160% in the middle of the stage). | 8 | 32 | 11 | medium | landing lag 11 |
| Up (air) | **Somersault Slash** — A backflip with the sword held out: the blade sweeps a circle overhead. Sends straight up, so Valkyrie can jump after the opponent and hit again. | 5 | 28 | 8 | medium | landing lag 6 |
| Down (air) | **Talon Stomp** — Stomps straight down with both feet. The first frames spike (send straight down). | 9 | 32 | 12 | medium | landing lag 12; spikes |
| Neutral special | **Gale Burst** — A beat of the wings: a burst around Valkyrie that pops anyone close straight up. In the air, Valkyrie stops and hangs for a moment. | 6 | 30 | 5 | light |  |
| Side special | **Wing Dash** — Dashes forward stretched out flat, sword first, level even in the air (no falling during the dash). Also a way back to the stage. | 6 | 32 | 8 | medium |  |
| Up special | **Shuttle Loop** — Like Meta Knight's Shuttle Loop: flies up slashing (small hits that carry the opponent up with her), loops backward all the way round, flies straight up again through the opponent with a launcher (KOs a mid-weight at about 230% in the middle of the stage), and comes out of it gliding forward (holding a direction at the start turns her that way). While gliding, up holds height but slows down, down dives, back slows; any attack, jump or dodge ends the glide and comes out at once, and jumps left are kept. The recovery move. | 6 | 38 | 6 | medium | ends in a glide; 3+ hits of 2 |
| Down special | **Spear Dive** — Hops if on the ground, then dives straight down sword first (the tip spikes in the air; an opponent standing on the ground is held instead); landing pops nearby opponents up on both sides. | 10 | 12 + 20 on landing | 8 | medium | holds a standing opponent for the landing hit; falls until landing; spikes |

