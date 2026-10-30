import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Dumbbell, Eye, Shuffle, Swords } from 'lucide-react';
import { PageLayout, PageTitle, PlayLayout } from '../components/Layout';
import { Button, ButtonLink, Card, Segmented, cx } from '../components/ui';
import { GAMES } from '../config';
import { sfx } from '../lib/audio/sfx';
import { useMusic } from '../lib/audio/useMusic';
import { newSeed, randomInt, type HasRng } from '../lib/rng';
import { createStore, useStore } from '../lib/store';
import { GameHome } from '../pages/GameHome';
import { DIFFICULTIES, cpuInput, createCpu, type Cpu, type Difficulty } from './ai';
import { BEST_OF_OPTIONS, DEFAULT_RULES, STOCK_OPTIONS, TIME_OPTIONS, matchSettings, rulesText, scoreGame, type MatchRules, type SetScore } from './matchRules';
import { fighterColor } from './render/figure';
import type { PlayerLabel } from './render/scene';
import { CHAR_IDS, CHARS } from './sim/chars';
import { STAGES, STAGE_IDS } from './sim/stages';
import { createMatch, endInDraw, step } from './sim/step';
import type { CharId, MatchState, StageId } from './sim/types';
import { CharacterGrid, CharacterInfo, type Pick } from './ui/CharacterGrid';
import { ControlsHelp } from './ui/Controls';
import { FightView, type FightDriver } from './ui/FightView';
import { Portrait } from './ui/Portrait';
import { StagePicker, type StagePick } from './ui/StagePicker';
import { createFighterRoom, joinFighterRoom } from './online';

const PATH = GAMES.fighter.path;

export function FighterHome() {
  useMusic('menu');
  return (
    <GameHome
      game="fighter"
      about={<>Hits build up damage, and damage makes the next hit knock harder. Knock your opponent off the stage. Three stocks each and three minutes, unless you change the rules (time, stocks, and best of one, three or five).</>}
      onCreate={() => void createFighterRoom()}
      onJoin={(code) => void joinFighterRoom(code)}
      practice={
        <div className="mt-3 grid grid-cols-2 gap-3">
          <ButtonLink to={`${PATH}/watch`} onClick={() => sfx.click()} size="lg" press className="w-full border-2 border-navy">
            <Eye className="size-5" />
            Watch CPUs
          </ButtonLink>
          <ButtonLink to={`${PATH}/training`} onClick={() => sfx.click()} size="lg" press className="w-full border-2 border-navy">
            <Dumbbell className="size-5" />
            Training
          </ButtonLink>
        </div>
      }
    />
  );
}

// ---------------------------------------------------------------- local matches (CPU and watching)

/** One CPU in a setup: its fighter (or Random) and difficulty. */
export interface Foe {
  pick: Pick;
  level: Difficulty;
}

/** A match on this device. `cpus[slot]` plays that slot; slots without one take this device's buttons. */
export function localDriver(chars: CharId[], stage: StageId, cpus: (Cpu | null)[], rules: MatchRules = DEFAULT_RULES): FightDriver {
  const state = createMatch({ stage, chars, seed: newSeed(), ...matchSettings(rules) });
  return {
    state,
    tick(local) {
      return step(
        state,
        state.fighters.map((_, i) => {
          const cpu = cpus[i];
          return cpu ? cpuInput(state, i, cpu) : local;
        }),
      );
    },
  };
}

/** Settles Random picks. */
export function settle(picks: Pick[], stage: StagePick): { chars: CharId[]; stage: StageId } {
  const rng: HasRng = { rng: newSeed() };
  return {
    chars: picks.map((p) => (p === 'random' ? CHAR_IDS[randomInt(rng, CHAR_IDS.length)] : p)),
    stage: stage === 'random' ? STAGE_IDS[randomInt(rng, STAGE_IDS.length)] : stage,
  };
}

interface LocalMatch {
  /** A new game with the same fighters, stage and CPUs (each game of a set starts fresh). */
  newDriver: () => FightDriver;
  labels: PlayerLabel[];
  chars: CharId[];
  stage: StageId;
  mySlot: number;
  rules: MatchRules;
}

/** Kept while the app is open (not saved). */
const cpuSetup = createStore<{ pick: Pick | null; foes: Foe[]; stage: StagePick; rules: MatchRules }>({
  pick: null,
  foes: [{ pick: 'random', level: 'normal' }],
  stage: 'random',
  rules: DEFAULT_RULES,
});
const watchSetup = createStore<{ foes: Foe[]; stage: StagePick; rules: MatchRules }>({
  foes: [
    { pick: 'random', level: 'hard' },
    { pick: 'random', level: 'hard' },
  ],
  stage: 'random',
  rules: DEFAULT_RULES,
});

/** Between games of a set: the score shows this long, then the next game starts. */
export const NEXT_GAME_SECONDS = 4;

/**
 * Plays a set-up local match: one game, or a best of 3 or 5 that goes straight
 * from one game into the next (same fighters and stage) until someone has won
 * enough. The result card comes at the end of each game.
 */
function LocalMatchScreen({ match, onBack, backLabel }: { match: LocalMatch; onBack: () => void; backLabel: string }) {
  // Each game: its driver, its number, and the score as it began.
  const [game, setGame] = useState(() => ({ driver: match.newDriver(), n: 1, wins: match.chars.map(() => 0) }));
  const [set, setSet] = useState<SetScore>(() => ({ wins: match.chars.map(() => 0), game: 1 }));
  const [result, setResult] = useState<{ state: MatchState; setWinner: number; done: boolean } | null>(null);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const series = match.rules.bestOf > 1;
  return (
    <PlayLayout>
      <FightView
        key={`game-${game.n}`}
        driver={game.driver}
        labels={match.labels}
        mySlot={match.mySlot}
        onLeave={() => {
          endInDraw(game.driver.state);
          onBack();
        }}
        onOver={(s) => {
          const scored = scoreGame(match.rules, set, s.winner);
          const done = !series || scored.setWinner >= 0;
          setSet(scored.set);
          setResult({ state: s, setWinner: scored.setWinner, done });
          if (!done)
            timer.current = window.setTimeout(() => {
              setResult(null);
              setGame((g) => ({ driver: match.newDriver(), n: g.n + 1, wins: scored.set.wins }));
            }, NEXT_GAME_SECONDS * 1000);
        }}
        overlay={
          result && (
            <ResultCard
              state={result.state}
              labels={match.labels}
              set={series ? { wins: set.wins, game: game.n, setWinner: result.setWinner, bestOf: match.rules.bestOf } : undefined}
              backLabel={backLabel}
              onBack={() => {
                sfx.click();
                onBack();
              }}
              footer={result.done ? undefined : <p className="text-sm text-muted">Next game in {NEXT_GAME_SECONDS} seconds…</p>}
            />
          )
        }
      />
      <MatchIntro key={`intro-${game.n}`} chars={match.chars} stage={match.stage} game={series ? { n: game.n, wins: game.wins } : undefined} />
    </PlayLayout>
  );
}

export function FighterCpu() {
  const setup = useStore(cpuSetup);
  const [match, setMatch] = useState<LocalMatch | null>(null);

  const start = () => {
    if (!setup.pick) return;
    const { chars, stage } = settle([setup.pick, ...setup.foes.map((f) => f.pick)], setup.stage);
    const many = setup.foes.length > 1;
    const labels: PlayerLabel[] = [{ name: 'You', you: true }, ...setup.foes.map((_, i) => ({ name: many ? `CPU ${i + 1}` : 'CPU', you: false }))];
    const levels = setup.foes.map((f) => f.level);
    const rules = setup.rules;
    const newDriver = () => localDriver(chars, stage, [null, ...levels.map((l) => createCpu(l, newSeed()))], rules);
    setMatch({ newDriver, labels, chars, stage, mySlot: 0, rules });
  };

  if (match) return <LocalMatchScreen match={match} onBack={() => setMatch(null)} backLabel="Back to character select" />;

  return (
    <SetupLayout eyebrow="Platfighter · Play the CPU" title="Character select" intro="Pick your fighter, your opponents and the stage. With more than one CPU it is a free-for-all.">
      <div className="space-y-5">
        <Card className="p-4 sm:p-5">
          <CharacterGrid value={setup.pick} onChange={(pick) => cpuSetup.set((s) => ({ ...s, pick }))} />
        </Card>
        <Card className="p-5">
          <CharacterInfo pick={setup.pick} />
        </Card>
      </div>
      <div className="space-y-4">
        <FoesCard foes={setup.foes} counts={[1, 2, 3]} onChange={(foes) => cpuSetup.set((s) => ({ ...s, foes }))} />
        <StageCard value={setup.stage} onChange={(stage) => cpuSetup.set((s) => ({ ...s, stage }))} />
        <RulesCard value={setup.rules} onChange={(rules) => cpuSetup.set((s) => ({ ...s, rules }))} />
        <Button variant="primary" size="xl" press className="w-full" disabled={!setup.pick} onClick={start}>
          <Swords className="size-6" />
          Fight!
        </Button>
        {!setup.pick && <p className="text-center text-sm text-muted">Pick a fighter first.</p>}
        <Card className="p-5">
          <p className="label-caps text-muted">Controls</p>
          <div className="mt-3">
            <ControlsHelp />
          </div>
        </Card>
      </div>
    </SetupLayout>
  );
}

/** Watch CPUs fight each other. Nothing on this device plays. */
export function FighterWatch() {
  const setup = useStore(watchSetup);
  const [match, setMatch] = useState<LocalMatch | null>(null);

  const start = () => {
    const { chars, stage } = settle(
      setup.foes.map((f) => f.pick),
      setup.stage,
    );
    const levels = setup.foes.map((f) => f.level);
    const labels: PlayerLabel[] = setup.foes.map((_, i) => ({ name: `CPU ${i + 1}`, you: false }));
    const rules = setup.rules;
    const newDriver = () => localDriver(chars, stage, levels.map((l) => createCpu(l, newSeed())), rules);
    setMatch({ newDriver, labels, chars, stage, mySlot: -1, rules });
  };

  if (match) return <LocalMatchScreen match={match} onBack={() => setMatch(null)} backLabel="Back to the setup" />;

  return (
    <SetupLayout eyebrow="Platfighter · Watch CPUs" title="Watch CPUs" intro="Set up two to four CPUs and watch them fight. More than two is a free-for-all.">
      <div className="space-y-5">
        <FoesCard foes={setup.foes} counts={[2, 3, 4]} onChange={(foes) => watchSetup.set((s) => ({ ...s, foes }))} />
      </div>
      <div className="space-y-4">
        <StageCard value={setup.stage} onChange={(stage) => watchSetup.set((s) => ({ ...s, stage }))} />
        <RulesCard value={setup.rules} onChange={(rules) => watchSetup.set((s) => ({ ...s, rules }))} />
        <Button variant="primary" size="xl" press className="w-full" onClick={start}>
          <Eye className="size-6" />
          Watch
        </Button>
      </div>
    </SetupLayout>
  );
}

// ---------------------------------------------------------------- setup pieces

export function SetupLayout({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: ReactNode; children: ReactNode }) {
  useMusic('menu');
  return (
    <PageLayout back={{ to: PATH, label: 'Platfighter' }}>
      <PageTitle eyebrow={eyebrow} title={title}>
        {intro}
      </PageTitle>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">{children}</div>
    </PageLayout>
  );
}

/** How many CPUs, and for each its fighter and difficulty. */
function FoesCard({ foes, counts, onChange }: { foes: Foe[]; counts: number[]; onChange: (foes: Foe[]) => void }) {
  const setCount = (n: number) => {
    sfx.click();
    const next = foes.slice(0, n);
    while (next.length < n) next.push({ pick: 'random', level: next[next.length - 1]?.level ?? 'normal' });
    onChange(next);
  };
  const setFoe = (i: number, change: Partial<Foe>) => onChange(foes.map((f, k) => (k === i ? { ...f, ...change } : f)));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="label-caps text-muted">CPUs</p>
        <Segmented size="sm" label="Number of CPUs" value={String(foes.length)} onChange={(v) => setCount(Number(v))} options={counts.map((n) => ({ value: String(n), label: String(n) }))} />
      </div>
      <div className="mt-3 space-y-4">
        {foes.map((f, i) => (
          <div key={i}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display text-sm uppercase">
                {foes.length > 1 ? `CPU ${i + 1}` : 'CPU'} · <span className="text-muted">{f.pick === 'random' ? 'Random' : CHARS[f.pick].name}</span>
              </p>
              <Segmented
                size="xs"
                value={f.level}
                onChange={(level) => {
                  sfx.click();
                  setFoe(i, { level });
                }}
                options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTIES[d].name }))}
              />
            </div>
            <FighterChips value={f.pick} onChange={(pick) => setFoe(i, { pick })} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/** A compact fighter picker: small portraits and Random. */
export function FighterChips({ value, onChange }: { value: Pick; onChange: (p: Pick) => void }) {
  const pick = (p: Pick) => {
    sfx.click();
    onChange(p);
  };
  const chip = (selected: boolean) =>
    cx('flex aspect-square items-center justify-center rounded-lg border-2 bg-surface transition', selected ? 'border-accent shadow-pop' : 'border-line hover:border-navy/50');
  return (
    <div className="mt-2 grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Fighter">
      {CHAR_IDS.map((id) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} aria-label={CHARS[id].name} title={CHARS[id].name} onClick={() => pick(id)} className={chip(value === id)}>
          <Portrait id={id} size={38} />
        </button>
      ))}
      <button type="button" role="radio" aria-checked={value === 'random'} aria-label="Random" title="Random" onClick={() => pick('random')} className={cx(chip(value === 'random'), 'border-dashed')}>
        <Shuffle className="size-5 text-accent" />
      </button>
    </div>
  );
}

/**
 * The match rules: minutes on the clock (or none), stocks, and best of. Without
 * `onChange` it only shows them (the joiner of an online room).
 */
export function RulesCard({ value, onChange, note }: { value: MatchRules; onChange?: (r: MatchRules) => void; note?: ReactNode }) {
  const set = (change: Partial<MatchRules>) => {
    sfx.click();
    onChange?.({ ...value, ...change });
  };
  const row = (label: string, control: ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-display text-sm uppercase">{label}</span>
      {control}
    </div>
  );
  return (
    <Card className="p-5">
      <p className="label-caps text-muted">Rules · {rulesText(value)}</p>
      {onChange ? (
        <div className="mt-3 space-y-2.5">
          {row(
            'Minutes',
            <Segmented
              size="sm"
              label="Minutes"
              value={value.minutes === null ? 'none' : String(value.minutes)}
              onChange={(v) => set({ minutes: v === 'none' ? null : Number(v) })}
              options={TIME_OPTIONS.map((m) => ({ value: m === null ? 'none' : String(m), label: m === null ? 'No limit' : String(m) }))}
            />,
          )}
          {row(
            'Stocks',
            <Segmented size="sm" label="Stocks" value={String(value.stocks)} onChange={(v) => set({ stocks: Number(v) })} options={STOCK_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))} />,
          )}
          {row(
            'Best of',
            <Segmented size="sm" label="Best of" value={String(value.bestOf)} onChange={(v) => set({ bestOf: Number(v) })} options={BEST_OF_OPTIONS.map((n) => ({ value: String(n), label: String(n) }))} />,
          )}
        </div>
      ) : null}
      {note && <p className="mt-2 text-sm text-muted">{note}</p>}
    </Card>
  );
}

export function StageCard({ value, onChange, random = true }: { value: StagePick; onChange: (v: StagePick) => void; random?: boolean }) {
  return (
    <Card className="p-5">
      <p className="label-caps text-muted">Stage · {value === 'random' ? 'Random' : STAGES[value].name}</p>
      <div className="mt-3">
        <StagePicker value={value} onChange={onChange} random={random} />
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- shared match pieces

/** Each fighter's colour, with later copies of the same fighter in other shades (as in the match). */
function colorsOf(chars: CharId[]) {
  return chars.map((c, i) => fighterColor(CHARS[c], chars.slice(0, i).filter((x) => x === c).length));
}

/** "Fisticuffs vs Buster on Scaffold", shown for the first moments of a match (with the game and score in a set). */
export function MatchIntro({ chars, stage, game }: { chars: CharId[]; stage: StageId; game?: { n: number; wins: number[] } }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 2600);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  const colors = colorsOf(chars);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4">
      <div className="animate-rise rounded-2xl border-2 border-navy bg-surface/95 px-5 py-3 text-center shadow-pop">
        <p className="font-display text-xl uppercase leading-tight sm:text-2xl">
          {chars.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="text-muted"> vs </span>}
              <span style={{ color: colors[i] }}>{CHARS[c].name}</span>
            </span>
          ))}
        </p>
        <p className="label-caps mt-1 text-muted">
          {STAGES[stage].name}
          {game && ` · Game ${game.n} · ${game.wins.join('–')}`}
        </p>
      </div>
    </div>
  );
}

export function ResultCard({
  state,
  labels,
  onBack,
  backLabel = 'Back to character select',
  footer,
  set,
}: {
  state: MatchState;
  labels: PlayerLabel[];
  onBack?: () => void;
  backLabel?: string;
  /** Shown instead of the button (an online room moves on by itself, and so does the next game of a set). */
  footer?: ReactNode;
  /** In a best of 3 or 5: games won so far, the game just played, and the set's winner once decided (-1: not yet). */
  set?: { wins: number[]; game: number; setWinner: number; bestOf: number };
}) {
  const w = state.winner;
  const draw = w === -1 || w === null;
  const youWon = !draw && labels[w!]?.you;
  const setDone = !!set && set.setWinner >= 0;
  const youWonSet = setDone && labels[set!.setWinner]?.you;
  const title = setDone
    ? youWonSet
      ? 'You win the set!'
      : `${labels[set!.setWinner]?.name ?? 'Opponent'} wins the set`
    : draw
      ? 'Draw'
      : youWon
        ? 'You win!'
        : `${labels[w!]?.name ?? 'Opponent'} wins`;
  const why =
    state.endReason === 'time'
      ? 'Time ran out. Most stocks left wins.'
      : state.endReason === 'sudden-time'
        ? 'Sudden death ran a full minute, so the match is a draw.'
        : state.endReason === 'disconnect'
          ? 'A player left or lost connection, so the match is a draw.'
          : draw
            ? 'The last fighters went out at the same moment.'
            : 'Last fighter standing.';
  return (
    <div className="absolute inset-0 z-[45] flex animate-fade items-center justify-center bg-navy/35 p-4">
      <div className="w-full max-w-md animate-rise rounded-3xl border-2 border-navy bg-surface p-6 text-center shadow-pop">
        <p className="label-caps text-accent">{set ? `Game ${set.game} · best of ${set.bestOf}` : 'Match over'}</p>
        <h2 className={cx('mt-2 text-5xl', (setDone ? youWonSet : youWon) && 'text-accent')}>{title}</h2>
        <p className="mt-2 text-muted">
          {setDone && !draw && `${labels[w!]?.you ? 'You' : (labels[w!]?.name ?? 'Opponent')} took the last game. `}
          {why}
          {set && draw && !setDone && ' A drawn game does not count.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {state.fighters.map((f) => (
            <div key={f.slot} className="text-center">
              <p className="flex items-center justify-center gap-1.5 font-display text-sm uppercase">
                <span className="size-3 rounded-full border-2 border-navy" style={{ background: fighterColor(CHARS[f.char], f.palette) }} />
                {labels[f.slot]?.name} · {CHARS[f.char].name}
              </p>
              <p className="text-xs text-muted">{f.act === 'out' ? 'Out' : `${f.stocks} ${f.stocks === 1 ? 'stock' : 'stocks'} left`}</p>
              {set && (
                <p className="font-display text-lg leading-tight">
                  {set.wins[f.slot] ?? 0} {set.wins[f.slot] === 1 ? 'game' : 'games'}
                </p>
              )}
            </div>
          ))}
        </div>
        {footer ? (
          <div className="mt-6">{footer}</div>
        ) : (
          <Button variant="primary" size="lg" press className="mt-6" onClick={onBack}>
            {backLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
