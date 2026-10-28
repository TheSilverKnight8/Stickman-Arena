import { POOL, MAX_TABLE, TARGET, card, randomDeck, type SideCard } from './cards';
import { other, total, type PazaakAction, type PazaakState, type Seat } from './rules';

// The Pazaak CPU. Both levels play the same way; they differ only in deck,
// as the spec says. Normal uses the plain + and − cards. Advanced also uses
// the ± cards and always carries the tiebreaker.

export type CpuLevel = 'normal' | 'advanced';

export const CPU_LEVELS: Record<CpuLevel, { name: string; about: string }> = {
  normal: { name: 'Normal', about: 'Plays with plain + and − cards only.' },
  advanced: { name: 'Advanced', about: 'Also plays ± cards and the tiebreaker.' },
};

const PLAIN: SideCard[] = POOL.filter((c) => c.kind === 'plus' || c.kind === 'minus');

export function cpuDeck(level: CpuLevel): string[] {
  if (level === 'normal') return randomDeck(PLAIN);
  return randomDeck(POOL, ['±1T']);
}

interface Option {
  slot: number;
  sign: 1 | -1;
  value: number;
  tiebreaker: boolean;
}

/** Every hand card the CPU could play now, with each sign a ± card allows. */
function options(s: PazaakState, seat: Seat): Option[] {
  const p = s.players[seat];
  if (p.playedThisTurn || p.table.length >= MAX_TABLE) return [];
  const out: Option[] = [];
  p.hand.forEach((id, slot) => {
    if (!id || id === '?') return;
    const c = card(id);
    if (c.kind === 'plus') out.push({ slot, sign: 1, value: c.value, tiebreaker: false });
    else if (c.kind === 'minus') out.push({ slot, sign: -1, value: -c.value, tiebreaker: false });
    else
      for (const sign of [1, -1] as const) out.push({ slot, sign, value: sign * c.value, tiebreaker: c.kind === 'tiebreaker' });
  });
  return out;
}

/**
 * What the CPU does on its turn, after the automatic draw: at most one hand
 * card, then end the turn or stand. Returns the actions in order.
 */
export function cpuTurn(s: PazaakState, seat: Seat): PazaakAction[] {
  const me = s.players[seat];
  const opp = s.players[other(seat)];
  const t = total(me);
  const oppT = total(opp);
  const opts = options(s, seat);
  const play = (o: Option) => ({ type: 'play', seat, slot: o.slot, sign: o.sign }) as PazaakAction;
  const stand: PazaakAction = { type: 'stand', seat };
  const end: PazaakAction = { type: 'endTurn', seat };
  const best = (fits: (n: number, o: Option) => boolean) =>
    opts.filter((o) => fits(t + o.value, o)).sort((a, b) => t + b.value - (t + a.value) || Math.abs(a.value) - Math.abs(b.value))[0];

  // Eight cards down: a ninth that keeps the total at 20 or under wins the set.
  if (me.table.length === MAX_TABLE - 1) {
    const o = best((n) => n <= TARGET);
    if (o) return [play(o)];
  }

  if (opp.standing) {
    // Beat the standing total, or tie it with the tiebreaker.
    if (t > oppT && t <= TARGET) return [stand];
    const win = best((n) => n > oppT && n <= TARGET) ?? best((n, o) => n === oppT && (o.tiebreaker || me.tiebreaker));
    if (win) return [play(win), stand];
    if (t === oppT && me.tiebreaker) return [stand];
    if (t > TARGET) {
      const save = best((n) => n <= TARGET);
      return save ? [play(save), end] : [end];
    }
    // A tie replays the set. Take it from a high total rather than risk busting.
    if (t === oppT && t >= 17) return [stand];
    return [end];
  }

  if (t > TARGET) {
    const save = best((n) => n <= TARGET);
    if (!save) return [end];
    return t + save.value >= 18 ? [play(save), stand] : [play(save), end];
  }
  if (t === TARGET) return [stand];
  // Hand cards last the whole match, so only spend one to land on 19 or 20.
  const finish = best((n) => n >= 19 && n <= TARGET);
  if (finish && t < 19) return [play(finish), stand];
  if (t >= 18) return [stand];
  if (t === 17 && oppT < 17) return [stand];
  return [end];
}
