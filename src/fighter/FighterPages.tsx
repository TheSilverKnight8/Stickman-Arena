import { useEffect, useState, type ReactNode } from 'react';
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
      about={<>Hits build up damage, and damage makes the next hit knock harder. Knock your opponent off the stage. Three stocks each, three minutes.</>}
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
export function localDriver(chars: CharId[], stage: StageId, cpus: (Cpu | null)[]): FightDriver {
  const state = createMatch({ stage, chars, seed: newSeed() });
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
  driver: FightDriver;
  labels: PlayerLabel[];
  chars: CharId[];
  stage: StageId;
  mySlot: number;
}

/** Kept while the app is open (not saved). */
const cpuSetup = createStore<{ pick: Pick | null; foes: Foe[]; stage: StagePick }>({
  pick: null,
  foes: [{ pick: 'random', level: 'normal' }],
  stage: 'random',
});
const watchSetup = createStore<{ foes: Foe[]; stage: StagePick }>({
  foes: [
    { pick: 'random', level: 'hard' },
    { pick: 'random', level: 'hard' },
  ],
  stage: 'random',
});

/** Plays a set-up local match, with the result card at the end. */
function LocalMatchScreen({ match, onBack, backLabel }: { match: LocalMatch; onBack: () => void; backLabel: string }) {
  const [result, setResult] = useState<MatchState | null>(null);
  return (
    <PlayLayout>
      <FightView
        driver={match.driver}
        labels={match.labels}
        mySlot={match.mySlot}
        onLeave={() => {
          endInDraw(match.driver.state);
          onBack();
        }}
        onOver={(s) => setResult(s)}
        overlay={
          result && (
            <ResultCard
              state={result}
              labels={match.labels}
              backLabel={backLabel}
              onBack={() => {
                sfx.click();
                onBack();
              }}
            />
          )
        }
      />
      <MatchIntro chars={match.chars} stage={match.stage} />
    </PlayLayout>
  );
}

export function FighterCpu() {
  const setup = useStore(cpuSetup);
  const [match, setMatch] = useState<LocalMatch | null>(null);

  const start = () => {
    if (!setup.pick) return;
    const { chars, stage } = settle([setup.pick, ...setup.foes.map((f) => f.pick)], setup.stage);
    const cpus = [null, ...setup.foes.map((f) => createCpu(f.level, newSeed()))];
    const many = setup.foes.length > 1;
    const labels: PlayerLabel[] = [{ name: 'You', you: true }, ...setup.foes.map((_, i) => ({ name: many ? `CPU ${i + 1}` : 'CPU', you: false }))];
    setMatch({ driver: localDriver(chars, stage, cpus), labels, chars, stage, mySlot: 0 });
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
    const cpus = setup.foes.map((f) => createCpu(f.level, newSeed()));
    const labels: PlayerLabel[] = setup.foes.map((_, i) => ({ name: `CPU ${i + 1}`, you: false }));
    setMatch({ driver: localDriver(chars, stage, cpus), labels, chars, stage, mySlot: -1 });
  };

  if (match) return <LocalMatchScreen match={match} onBack={() => setMatch(null)} backLabel="Back to the setup" />;

  return (
    <SetupLayout eyebrow="Platfighter · Watch CPUs" title="Watch CPUs" intro="Set up two to four CPUs and watch them fight. More than two is a free-for-all.">
      <div className="space-y-5">
        <FoesCard foes={setup.foes} counts={[2, 3, 4]} onChange={(foes) => watchSetup.set((s) => ({ ...s, foes }))} />
      </div>
      <div className="space-y-4">
        <StageCard value={setup.stage} onChange={(stage) => watchSetup.set((s) => ({ ...s, stage }))} />
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
        <Segmented size="sm" value={String(foes.length)} onChange={(v) => setCount(Number(v))} options={counts.map((n) => ({ value: String(n), label: String(n) }))} />
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

/** "Fisticuffs vs Buster on Scaffold", shown for the first moments of a match. */
export function MatchIntro({ chars, stage }: { chars: CharId[]; stage: StageId }) {
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
        <p className="label-caps mt-1 text-muted">{STAGES[stage].name}</p>
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
}: {
  state: MatchState;
  labels: PlayerLabel[];
  onBack?: () => void;
  backLabel?: string;
  /** Shown instead of the button (an online room moves on by itself). */
  footer?: ReactNode;
}) {
  const w = state.winner;
  const draw = w === -1 || w === null;
  const youWon = !draw && labels[w!]?.you;
  const title = draw ? 'Draw' : youWon ? 'You win!' : `${labels[w!]?.name ?? 'Opponent'} wins`;
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
        <p className="label-caps text-accent">Match over</p>
        <h2 className={cx('mt-2 text-5xl', youWon && 'text-accent')}>{title}</h2>
        <p className="mt-2 text-muted">{why}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
          {state.fighters.map((f) => (
            <div key={f.slot} className="text-center">
              <p className="flex items-center justify-center gap-1.5 font-display text-sm uppercase">
                <span className="size-3 rounded-full border-2 border-navy" style={{ background: fighterColor(CHARS[f.char], f.palette) }} />
                {labels[f.slot]?.name} · {CHARS[f.char].name}
              </p>
              <p className="text-xs text-muted">{f.act === 'out' ? 'Out' : `${f.stocks} ${f.stocks === 1 ? 'stock' : 'stocks'} left`}</p>
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
