import { Shuffle } from 'lucide-react';
import { cx } from '../../components/ui';
import { sfx } from '../../lib/audio/sfx';
import { CHAR_IDS, CHARS } from '../sim/chars';
import type { CharId } from '../sim/types';
import { ROSTER, ratings } from '../roster';
import { Portrait } from './Portrait';

export type Pick = CharId | 'random';

/** The five fighters and Random, as big buttons. */
export function CharacterGrid({ value, onChange, disabled = false }: { value: Pick | null; onChange: (p: Pick) => void; disabled?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6" role="radiogroup" aria-label="Fighters">
      {CHAR_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          disabled={disabled}
          onClick={() => {
            sfx.click();
            onChange(id);
          }}
          className={cx(
            'group flex flex-col items-center rounded-2xl border-2 bg-surface px-1 pb-2 pt-1 transition disabled:opacity-60',
            value === id ? 'border-accent shadow-pop -translate-y-0.5' : 'border-line hover:border-navy/50',
          )}
        >
          <Portrait id={id} size={84} />
          <span className="font-display text-base uppercase leading-none" style={{ color: value === id ? undefined : undefined }}>
            {CHARS[id].name}
          </span>
          <span className="mt-1 text-[0.6875rem] text-muted">{CHARS[id].archetype}</span>
        </button>
      ))}
      <button
        type="button"
        role="radio"
        aria-checked={value === 'random'}
        disabled={disabled}
        onClick={() => {
          sfx.click();
          onChange('random');
        }}
        className={cx(
          'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-surface px-1 pb-2 pt-1 transition disabled:opacity-60',
          value === 'random' ? 'border-accent shadow-pop -translate-y-0.5' : 'border-line hover:border-navy/50',
        )}
      >
        <span className="flex size-[84px] items-center justify-center">
          <Shuffle className="size-10 text-accent" />
        </span>
        <span className="font-display text-base uppercase leading-none">Random</span>
        <span className="mt-1 text-[0.6875rem] text-muted">Any of the five</span>
      </button>
    </div>
  );
}

/** Name, archetype, strengths, weaknesses and ratings for the picked fighter. */
export function CharacterInfo({ pick }: { pick: Pick | null }) {
  if (!pick) return <p className="text-sm text-muted">Pick a fighter to see what they are good at.</p>;
  if (pick === 'random')
    return (
      <div>
        <p className="font-display text-2xl uppercase">Random</p>
        <p className="mt-1 text-sm text-muted">One of the five fighters, chosen when the match starts.</p>
      </div>
    );
  const c = CHARS[pick];
  const r = ratings(pick);
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl uppercase" style={{ color: c.color }}>
          {c.name}
        </span>
        <span className="label-caps text-muted">{c.archetype}</span>
      </div>
      <dl className="mt-2 space-y-1.5 text-sm">
        <div>
          <dt className="label-caps inline text-muted">Strengths </dt>
          <dd className="inline">{ROSTER[pick].strengths}</dd>
        </div>
        <div>
          <dt className="label-caps inline text-muted">Weaknesses </dt>
          <dd className="inline">{ROSTER[pick].weaknesses}</dd>
        </div>
      </dl>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Rating label="Weight" value={r.weight} />
        <Rating label="Speed" value={r.speed} />
        <Rating label="Jump" value={r.jump} />
      </div>
    </div>
  );
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="label-caps text-muted">{label}</p>
      <div className="mt-1 flex gap-1" aria-label={`${label} ${value} of 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={cx('h-2.5 flex-1 rounded-sm', i <= value ? 'bg-navy' : 'bg-line')} />
        ))}
      </div>
    </div>
  );
}
