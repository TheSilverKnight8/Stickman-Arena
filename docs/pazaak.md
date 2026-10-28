# Pazaak rules (as Caleb wrote them)

These are the rules the game follows. `src/pazaak/rules.ts` implements them, and the automated checks test each one.

**Goal.** Get a higher total than your opponent without going over 20. Win 3 sets to win the match.

## Setup

1. The main deck has 40 cards: four each of 1 through 10. It's shared, and neither player chooses its cards.
2. Each player builds a 10-card side deck from the pool, with up to 2 copies of each card, or picks random.
3. At the start of the match, each player is dealt 4 random cards from their side deck as their hand. That hand lasts for all the sets of the match, and each hand card can be played once per match.

## A turn

1. The player draws a card from the main deck and puts it face up on their side of the table. This happens automatically.
2. They may then play one card from their hand. It's optional, and only one hand card can be played per turn.
3. Then they choose one of two things:
   - **End turn.** They'll draw another card at the start of their next turn.
   - **Stand.** They're done for the set, with no more draws and no more hand cards. The opponent keeps taking turns until they stand or bust.
4. If the 5-second timer runs out, the turn ends. The player doesn't stand.

**Busting.** A player busts if their total is over 20 at the end of their turn, and the opponent wins the set. Going over 20 mid-turn doesn't count. A player can draw a card that takes them over 20 and then play a negative card to get back under before the turn ends.

## Hand cards

- **Plain cards** (+1 to +6, −1 to −6). They add or subtract that value.
- **± cards** (±1 to ±6). The player chooses plus or minus when playing one, and it can't be changed afterward. (The spec calls these "flip cards".)
- **Tiebreaker** (±1T). A ±1 card. If both players stand on the same total, the player who played a Tiebreaker in that set wins it.

## Sets and ties

- The winner of a set is whoever stands with the higher total, or whoever's opponent busts.
- If a set ends tied, another set is played. No new hand cards are dealt, and the tied set counts for nobody.
- A player can't have more than 9 cards in play during a set, counting hand cards and drawn cards. At 9 cards, they stand automatically and win the set.
- Players alternate who draws first at the start of each set.

**Not in the game.** The 2&4 and 3&6 cards, the double card, and the 1±2 card.

## Caleb's answers to the open questions

| Question | Answer |
| --- | --- |
| Who draws first in the first set? | Random, online and against the CPU. After that, players alternate set by set. |
| What happens to the main deck between sets? | It carries through the match. Cards drawn stay out. If it runs out, the used cards are shuffled back in. |
| The Tiebreaker | A ±1 card when played. If both players stand on the same total, the player who played a Tiebreaker that set wins it. |

## How the game reads edge cases

These follow from the rules above. Each is listed so it can be checked.

- **A 9th card over 20:** no 10th card can be played to fix it, so it is a bust right away.
- **Standing over 20** is a bust (the turn ends over 20).
- **Both players played a Tiebreaker and tie:** neither one decides it, so the set is a tie and is replayed.
- **A tied set** still counts for the first-player rotation: the other player draws first in the next set.
- **Hand cards that are already played** stay gone for the rest of the match, ties included.
