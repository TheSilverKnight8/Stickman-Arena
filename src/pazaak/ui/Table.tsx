import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Button, cx } from '../../components/ui';
import { sfx } from '../../lib/audio/sfx';
import { useMusic } from '../../lib/audio/useMusic';
import { useLandscape } from '../../lib/useOrientation';
import { MAX_TABLE, SETS_TO_WIN, TARGET, card, needsSign } from '../cards';
import { TURN_MS } from '../match';
import { other, total, type PazaakAction, type PazaakEvent, type PlayerState, type Seat, type SetResult } from '../rules';
import type { TableView } from '../session';
import { CardFace } from './PazaakCard';

/**
 * The Pazaak table. Portrait: opponent on top, you below, your hand at the
 * bottom. Landscape: you on the left, the opponent on the right, your hand in
 * the middle.
 */
export function PazaakTable({
  view,
  onAct,
  onLeave,
  matchEnd,
  disconnectEnd,
}: {
  view: TableView;
  onAct: (a: PazaakAction) => void;
  onLeave: () => void;
  /** Buttons or text under the match result. */
  matchEnd: ReactNode;
  /** Buttons under the "draw" notice when the opponent drops out. */
  disconnectEnd: ReactNode;
}) {
  useMusic('pazaak');
  const landscape = useLandscape();
  const { state: s, mySeat, opponentName } = view;
  const oppSeat = other(mySeat);
  const me = s.players[mySeat];
  const opp = s.players[oppSeat];
  const myTurn = s.phase === 'turn' && s.turn === mySeat && !me.standing && !view.disconnected;
  const canPlay = myTurn && !me.playedThisTurn && me.table.length < MAX_TABLE;
  useEventSounds(s.events, s.version, mySeat);

  const status = statusText(view);
  const sideMe = <Side p={me} name="You" active={s.phase === 'turn' && s.turn === mySeat} />;
  const sideOpp = <Side p={opp} name={opponentName} active={s.phase === 'turn' && s.turn === oppSeat} hiddenHand small={!landscape} />;
  const center = (
    <div className="flex w-full flex-col items-center gap-1.5">
      <p className={cx('font-display text-[1.35rem] uppercase leading-none tracking-wide', myTurn ? 'text-accent' : 'text-ink')} aria-live="polite">
        {status}
      </p>
      <TurnTimer deadline={view.deadline} mine={myTurn} />
      <p className="text-xs text-muted">
        Set {s.setNumber} · Main deck {s.deckLeft}
      </p>
    </div>
  );
  const hand = <Hand me={me} canPlay={canPlay} myTurn={myTurn} mySeat={mySeat} onAct={onAct} />;

  return (
    <div
      className={cx(
        // Card width (--cw) comes from the height left after the fixed parts (bars, labels, buttons).
        'relative flex h-full flex-col [--cw:var(--cwb)]',
        landscape ? '[--cwb:clamp(26px,min(6.4vw,calc((100dvh-130px)/4.9)),84px)]' : '[--cwb:clamp(28px,min(12.5vw,calc((100dvh-300px)/9.9)),64px)]',
      )}
    >
      <div className="flex shrink-0 items-center gap-2 px-3 py-1.5">
        <Button size="xs" variant="ghost" onClick={onLeave}>
          <LogOut className="size-3.5" />
          Leave
        </Button>
        <span className="flex-1" />
        <span className="label-caps text-muted">Pazaak · First to {SETS_TO_WIN} sets</span>
      </div>

      {landscape ? (
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3 overflow-y-auto px-3 pb-2">
          <div className="justify-self-end">{sideMe}</div>
          <div className="flex w-[calc(var(--cw)*4+3.5rem)] flex-col items-center gap-3">
            {center}
            {hand}
          </div>
          <div className="justify-self-start">{sideOpp}</div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly gap-1 overflow-y-auto px-3 pb-2">
          {sideOpp}
          {center}
          {sideMe}
          {hand}
        </div>
      )}

      {s.phase === 'setOver' && s.lastSet && !view.disconnected && <SetBanner result={s.lastSet} mySeat={mySeat} opponentName={opponentName} />}
      {s.phase === 'matchOver' && !view.disconnected && (
        <Overlay>
          <p className="label-caps text-accent">Match over</p>
          <h2 className="mt-2 text-5xl">{s.winner === mySeat ? 'You win!' : `${opponentName} wins`}</h2>
          <p className="mt-2 font-display text-2xl uppercase text-muted">
            {me.sets} – {opp.sets}
          </p>
          <div className="mt-6">{matchEnd}</div>
        </Overlay>
      )}
      {view.disconnected && (
        <Overlay>
          <p className="label-caps text-accent">Match over</p>
          <h2 className="mt-2 text-5xl">Draw</h2>
          <p className="mt-2 max-w-sm text-muted">Your opponent left or lost connection, so the match ends in a draw.</p>
          <div className="mt-6">{disconnectEnd}</div>
        </Overlay>
      )}
    </div>
  );
}

function statusText(v: TableView) {
  const { state: s, mySeat, opponentName } = v;
  if (v.disconnected) return 'Match over';
  const me = s.players[mySeat];
  const opp = s.players[other(mySeat)];
  if (s.phase === 'setOver') return 'Set over';
  if (s.phase === 'matchOver') return 'Match over';
  if (s.turn === mySeat) return opp.standing ? `Your turn · ${opponentName} stands at ${total(opp)}` : 'Your turn';
  return me.standing ? `You stand at ${total(me)}` : `${opponentName}'s turn`;
}

function Side({ p, name, active, hiddenHand = false, small = false }: { p: PlayerState; name: string; active: boolean; hiddenHand?: boolean; small?: boolean }) {
  const t = total(p);
  const handLeft = p.hand.filter((h) => h !== null).length;
  return (
    <section
      className={cx(
        'rounded-2xl border-2 p-[calc(var(--cw)*0.16)] transition',
        active ? 'border-accent bg-surface shadow-pop' : 'border-line bg-surface/60',
        // In portrait the opponent's cards are drawn smaller to leave room for yours.
        small && '[--cw:calc(var(--cwb)*0.8)]',
      )}
      aria-label={`${name}: ${t}`}
    >
      <div className="mb-[calc(var(--cw)*0.14)] flex items-center gap-2">
        <span className="font-display text-lg uppercase leading-none tracking-wide">{name}</span>
        <span className="flex gap-1" aria-label={`${p.sets} sets won`}>
          {Array.from({ length: SETS_TO_WIN }, (_, i) => (
            <span key={i} className={cx('size-2.5 rounded-full border-2 border-navy', i < p.sets && 'bg-accent border-accent')} />
          ))}
        </span>
        <span className="flex-1" />
        {p.standing && <span className="rounded-md bg-navy px-1.5 py-0.5 font-display text-xs uppercase text-on-accent">Stands</span>}
        <span
          className={cx(
            'min-w-[2.2em] rounded-lg px-1.5 py-0.5 text-center font-display text-xl leading-none',
            t > TARGET ? 'bg-accent text-on-accent' : t === TARGET ? 'bg-navy text-on-accent' : 'bg-raised text-ink',
          )}
        >
          {t}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-[calc(var(--cw)*0.12)]">
        {Array.from({ length: MAX_TABLE }, (_, i) => {
          const c = p.table[i];
          if (!c) return <CardFace key={`e${i}`} face={{ kind: 'empty' }} />;
          return <CardFace key={`c${i}`} deal face={c.id ? { kind: 'side', id: c.id, played: c.value } : { kind: 'main', value: c.value }} />;
        })}
      </div>
      {hiddenHand && (
        <p className="mt-[calc(var(--cw)*0.12)] text-center text-xs text-muted">
          {handLeft} hand {handLeft === 1 ? 'card' : 'cards'} left
        </p>
      )}
    </section>
  );
}

function Hand({ me, canPlay, myTurn, mySeat, onAct }: { me: PlayerState; canPlay: boolean; myTurn: boolean; mySeat: Seat; onAct: (a: PazaakAction) => void }) {
  const [choosing, setChoosing] = useState<number | null>(null);
  useEffect(() => {
    if (!canPlay) setChoosing(null);
  }, [canPlay]);

  const tap = (slot: number) => {
    const id = me.hand[slot];
    if (!canPlay || !id) return;
    if (needsSign(id)) setChoosing(choosing === slot ? null : slot);
    else onAct({ type: 'play', seat: mySeat, slot });
  };

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div className="flex gap-[calc(var(--cw)*0.16)]" aria-label="Your hand">
        {me.hand.map((id, slot) =>
          id ? (
            <div key={slot} className="relative">
              <button
                type="button"
                disabled={!canPlay}
                onClick={() => tap(slot)}
                className={cx(
                  'block rounded-[calc(var(--cw)*0.12)] transition',
                  canPlay ? 'hover:-translate-y-1 active:translate-y-0' : 'opacity-60',
                  choosing === slot && '-translate-y-1 ring-3 ring-accent',
                )}
                aria-label={`Play ${id}`}
              >
                <CardFace face={{ kind: 'side', id }} />
              </button>
              {choosing === slot && <SignChooser id={id} onPick={(sign) => onAct({ type: 'play', seat: mySeat, slot, sign })} />}
            </div>
          ) : (
            <CardFace key={slot} face={{ kind: 'empty' }} />
          ),
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="navy" size="md" press disabled={!myTurn} onClick={() => onAct({ type: 'endTurn', seat: mySeat })} className="min-w-28">
          End turn
        </Button>
        <Button variant="primary" size="md" press disabled={!myTurn} onClick={() => onAct({ type: 'stand', seat: mySeat })} className="min-w-28">
          Stand
        </Button>
      </div>
    </div>
  );
}

/** Plus or minus for a ± card. The choice is final once played. */
function SignChooser({ id, onPick }: { id: string; onPick: (sign: 1 | -1) => void }) {
  const v = card(id).value;
  return (
    <div className="absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 animate-pop gap-1 rounded-xl border-2 border-navy bg-surface p-1 shadow-pop">
      <button type="button" className="h-10 min-w-12 rounded-lg bg-navy px-2 font-display text-xl text-on-accent" onClick={() => onPick(1)}>
        +{v}
      </button>
      <button type="button" className="h-10 min-w-12 rounded-lg bg-accent px-2 font-display text-xl text-on-accent" onClick={() => onPick(-1)}>
        −{v}
      </button>
    </div>
  );
}

function TurnTimer({ deadline, mine }: { deadline: number | null; mine: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let lastSecond = -1;
    const loop = () => {
      const left = deadline === null ? 0 : Math.max(0, deadline - performance.now());
      if (bar.current) bar.current.style.transform = `scaleX(${left / TURN_MS})`;
      const second = Math.ceil(left / 1000);
      if (num.current) num.current.textContent = deadline === null ? '' : String(second);
      if (mine && deadline !== null && second !== lastSecond && second > 0 && second <= 3) sfx.tick();
      lastSecond = second;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [deadline, mine]);
  return (
    <div className="flex w-full max-w-64 items-center gap-2" aria-hidden>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line">
        <div ref={bar} className={cx('h-full origin-left rounded-full', mine ? 'bg-accent' : 'bg-navy')} />
      </div>
      <span ref={num} className="w-4 text-right font-mono text-sm text-muted" />
    </div>
  );
}

function SetBanner({ result, mySeat, opponentName }: { result: SetResult; mySeat: Seat; opponentName: string }) {
  const { title, detail } = setText(result, mySeat, opponentName);
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
      <div className="animate-pop rounded-2xl border-2 border-navy bg-surface px-6 py-4 text-center shadow-pop">
        <p className={cx('font-display text-3xl uppercase', result.winner === mySeat ? 'text-accent' : 'text-ink')}>{title}</p>
        <p className="mt-1 text-sm text-muted">{detail}</p>
      </div>
    </div>
  );
}

export function setText(r: SetResult, mySeat: Seat, opp: string) {
  const mine = r.totals[mySeat];
  const theirs = r.totals[other(mySeat)];
  const title = r.winner === null ? 'Tied set' : r.winner === mySeat ? 'You win the set' : `${opp} wins the set`;
  let detail: string;
  switch (r.reason) {
    case 'bust':
      detail = r.winner === mySeat ? `${opp} went over 20 (${theirs}).` : `You went over 20 (${mine}).`;
      break;
    case 'nine':
      detail = `Nine cards in play without going over 20: ${r.winner === mySeat ? 'you win' : `${opp} wins`} automatically.`;
      break;
    case 'tiebreaker':
      detail = `Tied at ${mine}. The tiebreaker card decides it.`;
      break;
    case 'tie':
      detail = `Tied at ${mine}. It counts for nobody; the set is played again.`;
      break;
    default:
      detail = `${mine} to ${theirs}.`;
  }
  return { title, detail };
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex animate-fade items-center justify-center bg-navy/35 p-4">
      <div className="w-full max-w-md animate-rise rounded-3xl border-2 border-navy bg-surface p-6 text-center shadow-pop">{children}</div>
    </div>
  );
}

/** Plays the sounds for what just happened on the table, once per batch of events. */
function useEventSounds(events: PazaakEvent[], version: number, mySeat: Seat) {
  const seen = useRef(version);
  useEffect(() => {
    if (version === seen.current) return;
    seen.current = version;
    const endsMatch = events.some((e) => e.type === 'match');
    // Several things can happen in one action (a stand, then the next player's draw); space the sounds out.
    let delay = 0;
    const at = (fn: () => void) => {
      if (delay === 0) fn();
      else window.setTimeout(fn, delay);
      delay += 140;
    };
    for (const e of events) {
      switch (e.type) {
        case 'draw':
          at(sfx.draw);
          break;
        case 'play':
          at(sfx.play);
          break;
        case 'stand':
          at(sfx.stand);
          break;
        case 'bust':
          at(sfx.bust);
          break;
        case 'shuffle':
          at(sfx.shuffle);
          break;
        case 'endTurn':
          if (e.timeout && e.seat === mySeat) at(sfx.error);
          break;
        case 'set':
          if (endsMatch) break;
          if (e.result.winner === null) at(sfx.setTied);
          else if (e.result.winner === mySeat) at(sfx.setWon);
          else at(sfx.setLost);
          break;
        case 'match':
          if (e.winner === mySeat) at(sfx.matchWon);
          else at(sfx.matchLost);
          break;
      }
    }
  }, [version, events, mySeat]);
}
