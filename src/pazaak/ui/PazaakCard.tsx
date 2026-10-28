import type { ButtonHTMLAttributes } from 'react';
import { cx } from '../../components/ui';
import { card, cardLabel } from '../cards';

// Card faces. Sizes come from the --cw (card width) CSS variable of the
// surrounding layout, so the table can shrink to fit a phone.
//   Main deck: cream with a navy number.
//   + cards: navy. − cards: red. ± cards: split navy and red.
//   Tiebreaker: split, with a T.
//   Face down: navy with the stripe motif.

type Face =
  | { kind: 'main'; value: number }
  | { kind: 'side'; id: string; /** The value it was played as (± cards show their chosen sign). */ played?: number }
  | { kind: 'back' }
  | { kind: 'empty' };

const base =
  'relative inline-flex shrink-0 select-none items-center justify-center rounded-[calc(var(--cw)*0.12)] font-display leading-none w-[var(--cw)] h-[calc(var(--cw)*1.4)] text-[calc(var(--cw)*0.42)]';

export function CardFace({ face, className, deal }: { face: Face; className?: string; deal?: boolean }) {
  if (face.kind === 'empty') return <span className={cx(base, 'border-2 border-dashed border-line', className)} aria-hidden />;
  if (face.kind === 'back')
    return (
      <span
        className={cx(base, 'border-2 border-navy bg-navy', deal && 'animate-deal', className)}
        style={{ backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 6px, rgb(250 238 218 / 0.16) 6px 9px)' }}
        aria-label="Face-down card"
      />
    );
  if (face.kind === 'main')
    return (
      <span className={cx(base, 'border-2 border-navy bg-surface text-ink shadow-card', deal && 'animate-deal', className)} aria-label={`${face.value}`}>
        <span className="absolute inset-[calc(var(--cw)*0.07)] rounded-[calc(var(--cw)*0.07)] border border-navy/25" aria-hidden />
        {face.value}
      </span>
    );

  const c = card(face.id);
  const split = c.kind === 'flip' || c.kind === 'tiebreaker';
  const shownAs = face.played;
  let fill: string;
  let label: string;
  if (shownAs !== undefined) {
    fill = shownAs >= 0 ? 'bg-navy' : 'bg-accent';
    label = `${shownAs >= 0 ? '+' : '−'}${Math.abs(shownAs)}`;
  } else {
    fill = c.kind === 'plus' ? 'bg-navy' : c.kind === 'minus' ? 'bg-accent' : '';
    label = cardLabel(face.id).replace('T', '');
  }
  const splitBg = split && shownAs === undefined ? { background: 'linear-gradient(135deg, var(--navy) 0 50%, var(--accent) 50% 100%)' } : undefined;
  return (
    <span className={cx(base, 'border-2 border-navy text-on-accent shadow-card', fill, deal && 'animate-deal', className)} style={splitBg} aria-label={cardLabel(face.id)}>
      <span className="[text-shadow:0_1px_0_rgb(0_38_87/0.35)]">{label}</span>
      {/* Corner marks: ± for a flip card already played, T for the tiebreaker. */}
      {split && shownAs !== undefined && <span className="absolute left-[8%] top-[6%] text-[0.42em] opacity-85">±</span>}
      {c.kind === 'tiebreaker' && (
        <span className="absolute bottom-[6%] right-[7%] flex size-[1.5em] items-center justify-center rounded-full bg-cream pt-[0.08em] text-[0.36em] leading-none text-ink">T</span>
      )}
    </span>
  );
}

/** A side card you can tap (hand cards, the deck builder pool). */
export function CardButton({ id, className, ...rest }: { id: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(
        'rounded-[calc(var(--cw)*0.12)] transition enabled:hover:-translate-y-0.5 enabled:active:translate-y-0 disabled:opacity-55 disabled:cursor-default',
        className,
      )}
      {...rest}
    >
      <CardFace face={{ kind: 'side', id }} />
    </button>
  );
}
