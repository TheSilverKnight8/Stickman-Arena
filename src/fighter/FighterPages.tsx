import { useEffect, useState, type ReactNode } from 'react';
import { Swords } from 'lucide-react';
import { PageLayout, PageTitle, PlayLayout } from '../components/Layout';
import { Button, Card, Segmented, cx } from '../components/ui';
import { GAMES } from '../config';
import { sfx } from '../lib/audio/sfx';
import { useMusic } from '../lib/audio/useMusic';
import { newSeed, randomInt, type HasRng } from '../lib/rng';
import { createStore, useStore } from '../lib/store';
import { GameHome } from '../pages/GameHome';
import { DIFFICULTIES, cpuInput, createCpu, type Difficulty } from './ai';
import type { PlayerLabel } from './render/scene';
import { CHAR_IDS, CHARS } from './sim/chars';
import { STAGES, STAGE_IDS } from './sim/stages';
import { createMatch, endInDraw, step } from './sim/step';
import type { CharId, MatchState, StageId } from './sim/types';
import { CharacterGrid, CharacterInfo, type Pick } from './ui/CharacterGrid';
import { ControlsHelp } from './ui/Controls';
import { FightView, type FightDriver } from './ui/FightView';
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
    />
  );
}

// ---------------------------------------------------------------- CPU games

/** Kept while the app is open (not saved). */
const cpuSetup = createStore<{ pick: Pick | null; level: Difficulty }>({ pick: null, level: 'normal' });

interface CpuMatch {
  driver: FightDriver;
  labels: PlayerLabel[];
  you: CharId;
  cpuChar: CharId;
  stage: StageId;
}

export function FighterCpu() {
  const setup = useStore(cpuSetup);
  const [match, setMatch] = useState<CpuMatch | null>(null);
  const [result, setResult] = useState<MatchState | null>(null);

  const start = () => {
    if (!setup.pick) return;
    const pickRng: HasRng = { rng: newSeed() };
    const you = setup.pick === 'random' ? CHAR_IDS[randomInt(pickRng, CHAR_IDS.length)] : setup.pick;
    // Caleb's choice: the CPU's fighter and the stage are random.
    const cpuChar = CHAR_IDS[randomInt(pickRng, CHAR_IDS.length)];
    const stage = STAGE_IDS[randomInt(pickRng, STAGE_IDS.length)];
    const state = createMatch({ stage, chars: [you, cpuChar], seed: newSeed() });
    const cpu = createCpu(setup.level, newSeed());
    const driver: FightDriver = {
      state,
      tick(local) {
        return step(state, [local, cpuInput(state, 1, cpu)]);
      },
    };
    setResult(null);
    setMatch({ driver, labels: [{ name: 'You', you: true }, { name: 'CPU', you: false }], you, cpuChar, stage });
  };

  if (match)
    return (
      <PlayLayout>
        <FightView
          driver={match.driver}
          labels={match.labels}
          mySlot={0}
          onLeave={() => {
            endInDraw(match.driver.state);
            setMatch(null);
          }}
          onOver={(s) => setResult(s)}
          overlay={
            result && (
              <ResultCard
                state={result}
                labels={match.labels}
                onBack={() => {
                  sfx.click();
                  setMatch(null);
                }}
              />
            )
          }
        />
        <MatchIntro chars={[match.you, match.cpuChar]} stage={match.stage} />
      </PlayLayout>
    );

  return (
    <SelectScreen
      pick={setup.pick}
      level={setup.level}
      onPick={(pick) => cpuSetup.set((s) => ({ ...s, pick }))}
      onLevel={(level) => cpuSetup.set((s) => ({ ...s, level }))}
      onStart={start}
    />
  );
}

function SelectScreen({ pick, level, onPick, onLevel, onStart }: { pick: Pick | null; level: Difficulty; onPick: (p: Pick) => void; onLevel: (l: Difficulty) => void; onStart: () => void }) {
  useMusic('menu');
  return (
    <PageLayout back={{ to: PATH, label: 'Platfighter' }}>
      <PageTitle eyebrow="Platfighter · Play the CPU" title="Character select">
        The CPU's fighter and the stage are picked at random.
      </PageTitle>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <CharacterGrid value={pick} onChange={onPick} />
          </Card>
          <Card className="p-5">
            <CharacterInfo pick={pick} />
          </Card>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="label-caps text-muted">CPU difficulty</p>
            <Segmented
              className="mt-3 w-full"
              value={level}
              onChange={(l) => {
                sfx.click();
                onLevel(l);
              }}
              options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTIES[d].name }))}
            />
            <p className="mt-2 text-sm text-muted">{DIFFICULTIES[level].about}</p>
          </Card>
          <Button variant="primary" size="xl" press className="w-full" disabled={!pick} onClick={onStart}>
            <Swords className="size-6" />
            Fight!
          </Button>
          {!pick && <p className="text-center text-sm text-muted">Pick a fighter first.</p>}
          <Card className="p-5">
            <p className="label-caps text-muted">Controls</p>
            <div className="mt-3">
              <ControlsHelp />
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

/** "Fisticuffs vs Buster on Scaffold", shown for the first moments of a match. */
export function MatchIntro({ chars, stage }: { chars: CharId[]; stage: StageId }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setShow(false), 2600);
    return () => window.clearTimeout(t);
  }, []);
  if (!show) return null;
  const you = CHARS[chars[0]];
  const cpu = CHARS[chars[1]];
  const same = chars[0] === chars[1];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-12 z-20 flex justify-center px-4">
      <div className="animate-rise rounded-2xl border-2 border-navy bg-surface/95 px-5 py-3 text-center shadow-pop">
        <p className="font-display text-xl uppercase leading-tight sm:text-2xl">
          <span style={{ color: you.color }}>{you.name}</span> <span className="text-muted">vs</span> <span style={{ color: same ? cpu.alt : cpu.color }}>{cpu.name}</span>
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
            ? 'Both fighters went out at the same moment.'
            : 'Last fighter standing.';
  return (
    <div className="absolute inset-0 z-[45] flex animate-fade items-center justify-center bg-navy/35 p-4">
      <div className="w-full max-w-md animate-rise rounded-3xl border-2 border-navy bg-surface p-6 text-center shadow-pop">
        <p className="label-caps text-accent">Match over</p>
        <h2 className={cx('mt-2 text-5xl', youWon && 'text-accent')}>{title}</h2>
        <p className="mt-2 text-muted">{why}</p>
        <div className="mt-4 flex justify-center gap-4">
          {state.fighters.map((f) => (
            <div key={f.slot} className="text-center">
              <p className="flex items-center justify-center gap-1.5 font-display text-sm uppercase">
                <span className="size-3 rounded-full border-2 border-navy" style={{ background: f.palette ? CHARS[f.char].alt : CHARS[f.char].color }} />
                {labels[f.slot]?.name} · {CHARS[f.char].name}
              </p>
              <p className="text-xs text-muted">
                {f.act === 'out' ? 'Out' : `${f.stocks} ${f.stocks === 1 ? 'stock' : 'stocks'} left`}
              </p>
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
