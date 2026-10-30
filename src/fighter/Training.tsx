import { useEffect, useMemo, useRef, useState } from 'react';
import { Dumbbell, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { PlayLayout } from '../components/Layout';
import { Button, Card, Segmented, cx } from '../components/ui';
import { sfx } from '../lib/audio/sfx';
import { newSeed } from '../lib/rng';
import { createStore, useStore } from '../lib/store';
import { DIFFICULTIES, cpuInput, createCpu, needsRecovery, type Cpu, type Difficulty } from './ai';
import { FighterChips, SetupLayout, StageCard, settle } from './FighterPages';
import type { SceneOptions } from './render/scene';
import { moveOf } from './sim/body';
import { CHARS } from './sim/chars';
import { MATCH_FRAMES, STOCKS, createMatch, step } from './sim/step';
import { BTN, type CharId, type MatchState, type SimEvent, type StageId } from './sim/types';
import { CharacterGrid, CharacterInfo, type Pick } from './ui/CharacterGrid';
import { ControlsHelp } from './ui/Controls';
import { FightView, type FightDriver } from './ui/FightView';
import type { StagePick } from './ui/StagePicker';

// The training room (Caleb's friend's idea): you and a dummy on a stage with no
// timer and no stocks. The dummy can stand, jump, dodge or play as a CPU; in
// every mode it gets back to the stage and off ledges by itself (Caleb). Its
// damage can be set; positions and damage reset with a button; hitboxes can be
// shown; and the last hit and the combo are shown on screen. Offline only.

export type DummyMode = 'stand' | 'jump' | 'dodge' | 'cpu';

const DUMMY_MODES: { value: DummyMode; label: string }[] = [
  { value: 'stand', label: 'Stand' },
  { value: 'jump', label: 'Jump' },
  { value: 'dodge', label: 'Dodge' },
  { value: 'cpu', label: 'CPU' },
];

interface TrainingOptions {
  dummy: DummyMode;
  level: Difficulty;
  /** The dummy's damage after a reset or a KO. */
  damage: number;
  showBoxes: boolean;
  showInfo: boolean;
}

/** Kept while the app is open (not saved). */
const trainingSetup = createStore<{ pick: Pick | null; dummyPick: Pick; stage: StagePick } & TrainingOptions>({
  pick: null,
  dummyPick: 'random',
  stage: 'flatline',
  dummy: 'stand',
  level: 'normal',
  damage: 0,
  showBoxes: false,
  showInfo: true,
});

/** What the last hit on the dummy was, and the combo it belongs to. */
export interface HitInfo {
  move: string;
  dmg: number;
  kb: number;
  /** First frame the move can hit (null for projectiles and throws). */
  startup: number | null;
  combo: number;
  comboDmg: number;
}

/** Runs a training match: no timer, no stocks, the dummy driven by its setting. */
export class TrainingDriver implements FightDriver {
  state: MatchState;
  info: HitInfo | null = null;
  /** Counts up whenever `info` changes, so the screen knows to redraw it. */
  version = 0;
  private cpu: Cpu;
  /** Gets the dummy back to the stage and off ledges in every mode (the Hard CPU's recovery). */
  private recoverer = createCpu('hard', newSeed());
  /** Frames the dummy has been free to act, and frames left holding jump. */
  private dummyT = 0;
  private jumpHold = 0;

  constructor(
    private chars: CharId[],
    private stage: StageId,
    private opts: () => TrainingOptions,
  ) {
    this.state = this.fresh();
    this.cpu = createCpu(opts().level, newSeed());
  }

  private fresh(): MatchState {
    const s = createMatch({ stage: this.stage, chars: this.chars, seed: newSeed() });
    // No countdown and no "GO!".
    s.phase = 'play';
    s.phaseT = 60;
    s.fighters[1].damage = this.opts().damage;
    return s;
  }

  /** Back to the start positions, with the dummy at its set damage. */
  reset() {
    Object.assign(this.state, this.fresh());
    this.info = null;
    this.version++;
    this.dummyT = 0;
    this.jumpHold = 0;
    this.recoverer = createCpu('hard', newSeed());
  }

  /** A new CPU level for the dummy. */
  setLevel(level: Difficulty) {
    this.cpu = createCpu(level, newSeed());
  }

  setDummyDamage(damage: number) {
    this.state.fighters[1].damage = damage;
  }

  private dummyInput(): number {
    const s = this.state;
    const d = s.fighters[1];
    const o = this.opts();
    if (o.dummy === 'cpu') return cpuInput(s, 1, this.cpu);
    // Off the stage, on a ledge or on the respawn platform: get back like the Hard CPU does.
    if (needsRecovery(s, d)) {
      this.jumpHold = 0;
      this.dummyT = 0;
      return cpuInput(s, 1, this.recoverer, true);
    }
    // A jump already started is held for a full jump.
    if (this.jumpHold > 0) {
      this.jumpHold--;
      return BTN.jump;
    }
    // Otherwise the dummy acts after standing still for two thirds of a second:
    // a full jump, or a spot dodge.
    if (d.act !== 'idle' || o.dummy === 'stand') {
      this.dummyT = 0;
      return 0;
    }
    if (++this.dummyT < 40) return 0;
    this.dummyT = 0;
    if (o.dummy === 'jump') {
      this.jumpHold = 12;
      return BTN.jump;
    }
    return BTN.dodge;
  }

  tick(local: number): SimEvent[] {
    const s = this.state;
    const d = s.fighters[1];
    // Was the dummy still stunned (or held) when the next hit came? Then the hit continues the combo.
    const stunned = d.act === 'hurt' || d.act === 'held' || d.hitlag > 0;
    const events = step(s, [local, this.dummyInput()]);
    for (const e of events) {
      if (e.type === 'respawn' && e.slot === 1) d.damage = this.opts().damage;
      if (e.type !== 'hit' || e.victim !== 1) continue;
      const by = e.attacker >= 0 ? e.attacker : d.lastHitBy;
      if (by !== 0) continue;
      const a = s.fighters[0];
      const m = e.attacker >= 0 ? moveOf(a) : null;
      const starts = m ? [...(m.hits ?? []).filter((h) => !h.grab).map((h) => h.f[0]), ...(m.proj ?? []).map((p) => p.f)] : [];
      const combo = stunned && this.info ? this.info.combo + 1 : 1;
      this.info = {
        move: m ? m.name : 'Projectile',
        dmg: e.dmg,
        kb: e.kb,
        startup: starts.length ? Math.min(...starts) : null,
        combo,
        comboDmg: (combo > 1 && this.info ? this.info.comboDmg : 0) + e.dmg,
      };
      this.version++;
    }
    // No timer and no stocks: the match never ends.
    s.clock = MATCH_FRAMES;
    for (const f of s.fighters) f.stocks = STOCKS;
    return events;
  }
}

export function FighterTraining() {
  const setup = useStore(trainingSetup);
  const [session, setSession] = useState<{ chars: CharId[]; stage: StageId } | null>(null);

  const start = () => {
    if (!setup.pick) return;
    setSession(settle([setup.pick, setup.dummyPick], setup.stage));
  };

  if (session) return <TrainingSession chars={session.chars} stage={session.stage} onBack={() => setSession(null)} />;

  return (
    <SetupLayout eyebrow="Platfighter · Training" title="Training" intro="Practice against a dummy: no timer and no stocks. Change the dummy, its damage, hitboxes and move info from the training menu while playing.">
      <div className="space-y-5">
        <Card className="p-4 sm:p-5">
          <CharacterGrid value={setup.pick} onChange={(pick) => trainingSetup.set((s) => ({ ...s, pick }))} />
        </Card>
        <Card className="p-5">
          <CharacterInfo pick={setup.pick} />
        </Card>
      </div>
      <div className="space-y-4">
        <Card className="p-5">
          <p className="label-caps text-muted">Dummy · {setup.dummyPick === 'random' ? 'Random' : CHARS[setup.dummyPick].name}</p>
          <FighterChips value={setup.dummyPick} onChange={(dummyPick) => trainingSetup.set((s) => ({ ...s, dummyPick }))} />
        </Card>
        <StageCard value={setup.stage} onChange={(stage) => trainingSetup.set((s) => ({ ...s, stage }))} />
        <Button variant="primary" size="xl" press className="w-full" disabled={!setup.pick} onClick={start}>
          <Dumbbell className="size-6" />
          Start training
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

function TrainingSession({ chars, stage, onBack }: { chars: CharId[]; stage: StageId; onBack: () => void }) {
  const setup = useStore(trainingSetup);
  const optsRef = useRef<TrainingOptions>(setup);
  optsRef.current = setup;
  const [driver] = useState(() => new TrainingDriver(chars, stage, () => optsRef.current));
  const [menu, setMenu] = useState(false);
  const labels = useMemo(() => [{ name: 'You', you: true }, { name: 'Dummy', you: false }], []);
  const sceneOptions = useMemo<SceneOptions>(() => ({ training: true, showBoxes: () => optsRef.current.showBoxes }), []);
  const set = (change: Partial<TrainingOptions>) => trainingSetup.set((s) => ({ ...s, ...change }));

  const reset = () => {
    sfx.click();
    driver.reset();
  };

  return (
    <PlayLayout>
      <FightView
        driver={driver}
        labels={labels}
        mySlot={0}
        hold={menu}
        sceneOptions={sceneOptions}
        leaveText="Back to the training setup."
        onLeave={onBack}
        onOver={() => {}}
        overlay={
          <>
            <div className="absolute right-2 top-2 z-50 flex gap-1.5">
              <Button size="xs" variant="ghost" className="bg-surface/70" onClick={reset}>
                <RotateCcw className="size-3.5" />
                Reset
              </Button>
              <Button
                size="xs"
                variant="ghost"
                className="bg-surface/70"
                onClick={() => {
                  sfx.click();
                  setMenu(true);
                }}
              >
                <SlidersHorizontal className="size-3.5" />
                Training menu
              </Button>
            </div>
            {setup.showInfo && <MoveInfo driver={driver} />}
            {menu && (
              <TrainingMenu
                opts={setup}
                onChange={(change) => {
                  set(change);
                  if (change.level) driver.setLevel(change.level);
                  if (change.damage !== undefined) driver.setDummyDamage(change.damage);
                }}
                onReset={() => {
                  reset();
                  setMenu(false);
                }}
                onClose={() => {
                  sfx.click();
                  setMenu(false);
                }}
              />
            )}
          </>
        }
      />
    </PlayLayout>
  );
}

/** The last hit on the dummy and the combo, in a corner of the screen. */
function MoveInfo({ driver }: { driver: TrainingDriver }) {
  const [, redraw] = useState(0);
  useEffect(() => {
    let seen = driver.version;
    const t = window.setInterval(() => {
      if (driver.version !== seen) {
        seen = driver.version;
        redraw(seen);
      }
    }, 100);
    return () => window.clearInterval(t);
  }, [driver]);
  const i = driver.info;
  return (
    <div className="pointer-events-none absolute left-2 top-11 z-30 w-56 rounded-xl border-2 border-navy bg-surface/90 px-3 py-2 text-xs shadow-card">
      <p className="label-caps text-muted">Last hit</p>
      {i ? (
        <>
          <p className="font-display text-base uppercase leading-tight">{i.move}</p>
          <dl className="mt-1 grid grid-cols-3 gap-1 text-center">
            <Stat label="Damage" value={`${i.dmg}%`} />
            <Stat label="Knockback" value={String(Math.round(i.kb))} />
            <Stat label="Starts" value={i.startup === null ? '–' : `f${i.startup}`} />
          </dl>
          <p className={cx('mt-1.5 font-display text-sm uppercase', i.combo > 1 ? 'text-accent' : 'text-muted')}>
            {i.combo > 1 ? `Combo: ${i.combo} hits, ${i.comboDmg}%` : 'No combo'}
          </p>
        </>
      ) : (
        <p className="text-muted">Hit the dummy to see the numbers.</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-raised px-1 py-0.5">
      <dt className="text-[0.625rem] text-muted">{label}</dt>
      <dd className="font-display text-sm">{value}</dd>
    </div>
  );
}

const DAMAGE_STEPS = [0, 50, 100, 150];

function TrainingMenu({ opts, onChange, onReset, onClose }: { opts: TrainingOptions; onChange: (c: Partial<TrainingOptions>) => void; onReset: () => void; onClose: () => void }) {
  const damage = (d: number) => {
    sfx.click();
    onChange({ damage: Math.max(0, Math.min(300, d)) });
  };
  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-navy/35 p-3">
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-3xl border-2 border-navy bg-surface p-4 shadow-pop sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl">Training menu</h2>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="size-4" />
            Close
          </Button>
        </div>
        <p className="label-caps mt-3 text-muted">Dummy</p>
        <Segmented
          className="mt-2 w-full"
          value={opts.dummy}
          onChange={(dummy) => {
            sfx.click();
            onChange({ dummy });
          }}
          options={DUMMY_MODES}
        />
        {opts.dummy === 'cpu' && (
          <Segmented
            size="sm"
            className="mt-2 w-full"
            value={opts.level}
            onChange={(level) => {
              sfx.click();
              onChange({ level });
            }}
            options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTIES[d].name }))}
          />
        )}
        <p className="label-caps mt-3 text-muted">Dummy damage · {opts.damage}%</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="ghost" className="border border-line" onClick={() => damage(opts.damage - 10)}>
            −10
          </Button>
          <Button size="sm" variant="ghost" className="border border-line" onClick={() => damage(opts.damage + 10)}>
            +10
          </Button>
          {DAMAGE_STEPS.map((d) => (
            <Button key={d} size="sm" variant={opts.damage === d ? 'navy' : 'ghost'} className="border border-line" onClick={() => damage(d)}>
              {d}%
            </Button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">Applied now, and again after a reset or when the dummy comes back after a KO.</p>
        <p className="label-caps mt-3 text-muted">Show</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Toggle label="Hitboxes" on={opts.showBoxes} onToggle={() => onChange({ showBoxes: !opts.showBoxes })} />
          <Toggle label="Move info" on={opts.showInfo} onToggle={() => onChange({ showInfo: !opts.showInfo })} />
        </div>
        <Button variant="primary" size="lg" press className="mt-4 w-full" onClick={onReset}>
          <RotateCcw className="size-5" />
          Reset positions and damage
        </Button>
      </div>
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        sfx.click();
        onToggle();
      }}
      className={cx('flex items-center justify-between rounded-xl border-2 px-3 py-2 text-sm font-medium transition', on ? 'border-navy bg-navy text-on-accent' : 'border-line bg-surface text-ink')}
    >
      {label}
      <span className="label-caps">{on ? 'On' : 'Off'}</span>
    </button>
  );
}
