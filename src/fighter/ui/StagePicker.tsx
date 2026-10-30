import { Shuffle } from 'lucide-react';
import { cx } from '../../components/ui';
import { sfx } from '../../lib/audio/sfx';
import { STAGES, STAGE_IDS } from '../sim/stages';
import type { StageDef, StageId } from '../sim/types';

export type StagePick = StageId | 'random';

/** A small drawing of a stage: the base and its platforms. */
export function StagePreview({ stage, className }: { stage: StageDef; className?: string }) {
  const m = stage.main;
  const slab = [
    [m.x1, 0],
    [m.x2, 0],
    [m.x2 - 10, m.bottom],
    [m.x2 - 70, m.bottom - 70],
    [m.x1 + 70, m.bottom - 70],
    [m.x1 + 10, m.bottom],
  ]
    .map(([x, y]) => `${x},${-y}`)
    .join(' ');
  return (
    <svg viewBox="-440 -290 880 440" className={cx('aspect-[2/1]', className)} aria-hidden>
      <polygon points={slab} fill="#002657" />
      <rect x={m.x1 + 30} y={10} width={(m.x2 - m.x1) * 0.55} height={8} fill="#fc3f3f" />
      {stage.plats.map((p, i) => (
        <g key={i}>
          <rect x={p.x1} y={-p.y} width={p.x2 - p.x1} height={18} rx={4} fill="#002657" />
          <rect x={p.x1 + 10} y={-p.y + 6} width={(p.x2 - p.x1) * 0.35} height={5} fill="#fc3f3f" />
        </g>
      ))}
    </svg>
  );
}

/** The stages and Random, as small buttons with drawings (for the CPU, watch and training setups). */
export function StagePicker({ value, onChange, random = true }: { value: StagePick; onChange: (v: StagePick) => void; random?: boolean }) {
  const pick = (v: StagePick) => {
    sfx.click();
    onChange(v);
  };
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Stage">
      {STAGE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => pick(id)}
          className={cx(
            'flex flex-col rounded-xl border-2 bg-surface p-1.5 text-left transition',
            value === id ? 'border-accent shadow-pop -translate-y-0.5' : 'border-line hover:border-navy/50',
          )}
        >
          <StagePreview stage={STAGES[id]} className="w-full rounded-md bg-[#f6e7cf]" />
          <span className="mt-1 px-0.5 font-display text-sm uppercase leading-none">{STAGES[id].name}</span>
        </button>
      ))}
      {random && (
        <button
          type="button"
          role="radio"
          aria-checked={value === 'random'}
          onClick={() => pick('random')}
          className={cx(
            'flex flex-col rounded-xl border-2 border-dashed bg-surface p-1.5 text-left transition',
            value === 'random' ? 'border-accent shadow-pop -translate-y-0.5' : 'border-line hover:border-navy/50',
          )}
        >
          <span className="flex aspect-[2/1] w-full items-center justify-center rounded-md bg-raised">
            <Shuffle className="size-6 text-accent" />
          </span>
          <span className="mt-1 px-0.5 font-display text-sm uppercase leading-none">Random</span>
        </button>
      )}
    </div>
  );
}
