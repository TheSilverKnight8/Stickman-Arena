import { Eraser, Shuffle } from 'lucide-react';
import { Button, cx } from '../../components/ui';
import { sfx } from '../../lib/audio/sfx';
import { DECK_SIZE, MAX_COPIES, POOL, copiesOf, randomDeck, sortDeck } from '../cards';
import { CardButton, CardFace } from './PazaakCard';

const GROUPS = [
  { label: 'Plus', kind: 'plus' },
  { label: 'Minus', kind: 'minus' },
  { label: '±', kind: 'flip' },
  { label: 'Tiebreaker', kind: 'tiebreaker' },
] as const;

/**
 * Builds a 10-card side deck: tap a pool card to add it (up to 2 copies),
 * tap a deck card to take it out. Random fills all 10 slots from the pool.
 */
export function DeckBuilder({ deck, onChange, locked = false }: { deck: string[]; onChange: (d: string[]) => void; locked?: boolean }) {
  const add = (id: string) => {
    if (locked || deck.length >= DECK_SIZE || copiesOf(deck, id) >= MAX_COPIES) return sfx.error();
    sfx.play();
    onChange(sortDeck([...deck, id]));
  };
  const remove = (i: number) => {
    if (locked) return;
    sfx.back();
    onChange(deck.filter((_, j) => j !== i));
  };

  return (
    <div className="[--cw:clamp(38px,11vw,54px)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="label-caps text-muted">Your side deck</p>
          <p className={cx('mt-1 font-display text-2xl uppercase', deck.length === DECK_SIZE ? 'text-ink' : 'text-accent')}>
            {deck.length} / {DECK_SIZE} cards
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            press
            disabled={locked}
            onClick={() => {
              sfx.shuffle();
              onChange(randomDeck());
            }}
          >
            <Shuffle className="size-4" />
            Random
          </Button>
          <Button
            size="sm"
            press
            disabled={locked || deck.length === 0}
            onClick={() => {
              sfx.back();
              onChange([]);
            }}
          >
            <Eraser className="size-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 justify-items-center gap-2 rounded-2xl border-2 border-navy bg-raised p-3 sm:grid-cols-10" aria-label="Deck">
        {Array.from({ length: DECK_SIZE }, (_, i) =>
          deck[i] ? (
            <CardButton key={i} id={deck[i]} onClick={() => remove(i)} disabled={locked} title="Take out of the deck" className="animate-pop" />
          ) : (
            <CardFace key={i} face={{ kind: 'empty' }} />
          ),
        )}
      </div>

      <p className="mt-5 text-sm text-muted">
        {locked
          ? 'Your deck is locked in while you are ready.'
          : deck.length >= DECK_SIZE
            ? 'Your deck is full. Tap a card in it to take it out.'
            : `Tap a card to add it. Up to ${MAX_COPIES} of each card.`}
      </p>
      <div className="mt-3 space-y-3">
        {GROUPS.map((g) => (
          <div key={g.kind} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="shrink-0 font-display text-sm uppercase tracking-wide text-muted sm:w-24">{g.label}</span>
            <div className="flex flex-wrap gap-2">
              {POOL.filter((c) => c.kind === g.kind).map((c) => {
                const n = copiesOf(deck, c.id);
                return (
                  <div key={c.id} className="relative">
                    <CardButton id={c.id} onClick={() => add(c.id)} disabled={locked || n >= MAX_COPIES || deck.length >= DECK_SIZE} title={`Add ${c.id}`} />
                    {n > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-accent font-mono text-[0.6875rem] font-semibold text-on-accent ring-2 ring-surface">
                        {n}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
