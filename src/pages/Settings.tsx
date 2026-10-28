import { ArrowUpFromLine, Moon, Music, RotateCcw, Volume2 } from 'lucide-react';
import { PageLayout, PageTitle } from '../components/Layout';
import { Button, Card, Segmented } from '../components/ui';
import { GAMES, type GameId } from '../config';
import { sfx } from '../lib/audio/sfx';
import { useMusic } from '../lib/audio/useMusic';
import { DEFAULT_SETTINGS, updateSettings, useSettings } from '../lib/settings';

/** Settings, reached from each game's home page. The values are shared by both games. */
export function SettingsPage({ game }: { game: GameId }) {
  useMusic('menu');
  const s = useSettings();
  const g = GAMES[game];
  return (
    <PageLayout back={{ to: g.path, label: g.name }}>
      <PageTitle eyebrow={`${g.name} · Settings`} title="Settings">
        Nothing is saved, so settings go back to the defaults when the app is closed.
      </PageTitle>
      <p className="label-caps mt-8 text-muted">Both games</p>
      <Card className="mt-2 max-w-2xl divide-y divide-line">
        <Slider icon={<Moon className="size-5" />} label="Brightness" value={s.brightness} min={0.5} onChange={(v) => updateSettings({ brightness: v })} />
        <Slider icon={<Music className="size-5" />} label="Music volume" value={s.musicVolume} onChange={(v) => updateSettings({ musicVolume: v })} />
        <Slider
          icon={<Volume2 className="size-5" />}
          label="Effects volume"
          value={s.effectsVolume}
          onChange={(v) => updateSettings({ effectsVolume: v })}
          onRelease={() => sfx.click()}
        />
      </Card>
      {game === 'fighter' && (
        <>
          <p className="label-caps mt-6 text-muted">Platfighter</p>
          <Card className="mt-2 max-w-2xl px-5 py-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-muted">
                <ArrowUpFromLine className="size-5" />
              </span>
              <span className="w-36 shrink-0 font-display text-lg uppercase tracking-wide">Tap jump</span>
              <Segmented
                value={s.tapJump ? 'on' : 'off'}
                onChange={(v) => {
                  sfx.click();
                  updateSettings({ tapJump: v === 'on' });
                }}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'on', label: 'On' },
                ]}
              />
            </div>
            <p className="mt-2 text-sm text-muted">
              When on, pushing up (W, the up arrow, or the joystick) also jumps. Up with Attack or Special still does the up attack or up special. Hold up for a full jump; tap it for a short hop.
            </p>
          </Card>
        </>
      )}
      <Button
        className="mt-5"
        press
        onClick={() => {
          updateSettings({ ...DEFAULT_SETTINGS });
          sfx.click();
        }}
      >
        <RotateCcw className="size-4" />
        Back to defaults
      </Button>
    </PageLayout>
  );
}

function Slider({
  icon,
  label,
  value,
  min = 0,
  onChange,
  onRelease,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
  onRelease?: () => void;
}) {
  const pct = Math.round(value * 100);
  const fill = ((value - min) / (1 - min)) * 100;
  return (
    <label className="flex items-center gap-4 px-5 py-4">
      <span className="text-muted">{icon}</span>
      <span className="w-36 shrink-0 font-display text-lg uppercase tracking-wide">{label}</span>
      <input
        type="range"
        className="slider min-w-0 flex-1"
        min={min}
        max={1}
        step={0.05}
        value={value}
        style={{ ['--fill' as string]: `${fill}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onRelease}
        onKeyUp={onRelease}
        aria-label={label}
      />
      <span className="w-12 shrink-0 text-right font-mono text-sm text-muted">{pct}%</span>
    </label>
  );
}
