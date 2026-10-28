import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Bot, DoorOpen, LogIn, Settings as SettingsIcon } from 'lucide-react';
import { PageLayout, PageTitle } from '../components/Layout';
import { Button, ButtonLink, Card, cx } from '../components/ui';
import { GAMES, type GameId } from '../config';
import { sfx } from '../lib/audio/sfx';
import { CODE_LENGTH, normalizeCode } from '../net/room';

/**
 * A game's home page: create a room, join one with a code, play the CPU, settings.
 * `onCreate` and `onJoin` start the connection; the room screen shows its progress.
 */
export function GameHome({
  game,
  about,
  onCreate,
  onJoin,
  unavailable,
}: {
  game: GameId;
  about: ReactNode;
  onCreate: () => void;
  onJoin: (code: string) => void;
  /** Shown instead of the buttons while the game is not built yet. */
  unavailable?: string;
}) {
  const g = GAMES[game];
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const off = Boolean(unavailable);

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const c = normalizeCode(code);
    if (!c) {
      setProblem(`A room code is ${CODE_LENGTH} letters and numbers.`);
      sfx.error();
      return;
    }
    sfx.click();
    onJoin(c);
    navigate(`${g.path}/room`);
  };

  return (
    <PageLayout back={{ to: '/', label: 'Games' }}>
      <PageTitle eyebrow="Stickman Arena" title={g.name}>
        {about}
      </PageTitle>
      {unavailable && <p className="mt-6 max-w-2xl rounded-xl border border-warn/35 bg-warn/10 p-4 text-sm text-warn">{unavailable}</p>}

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card className={cx('p-5', off && 'pointer-events-none opacity-50')} aria-disabled={off}>
          <p className="label-caps text-muted">Play a friend online</p>
          <Button
            variant="primary"
            size="xl"
            press
            className="mt-4 w-full"
            disabled={off}
            onClick={() => {
              sfx.click();
              onCreate();
              navigate(`${g.path}/room`);
            }}
          >
            <DoorOpen className="size-6" />
            Create a room
          </Button>
          <form onSubmit={join} className="mt-5">
            <label htmlFor={`${game}-code`} className="text-sm text-muted">
              Or join a room with its code
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={`${game}-code`}
                value={code}
                disabled={off}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase().slice(0, CODE_LENGTH + 2));
                  setProblem(null);
                }}
                placeholder="ABCDE"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                className="h-14 w-0 min-w-0 flex-1 rounded-xl border-2 border-navy bg-surface px-4 text-center font-mono text-2xl uppercase tracking-[0.35em] text-ink outline-none placeholder:text-muted/40 focus:ring-3 focus:ring-navy/15"
              />
              <Button type="submit" variant="navy" size="lg" press className="h-14" disabled={off}>
                <LogIn className="size-5" />
                Join
              </Button>
            </div>
            {problem && <p className="mt-2 text-sm text-warn">{problem}</p>}
          </form>
        </Card>

        <div className="grid content-start gap-5">
          <Card className={cx('p-5', off && 'pointer-events-none opacity-50')}>
            <p className="label-caps text-muted">Practice</p>
            <ButtonLink to={`${g.path}/cpu`} onClick={() => sfx.click()} size="xl" press className="mt-4 w-full border-2 border-navy" tabIndex={off ? -1 : undefined}>
              <Bot className="size-6" />
              Play the CPU
            </ButtonLink>
            <p className="mt-2 text-sm text-muted">Works without an internet connection.</p>
          </Card>
          <ButtonLink to={`${g.path}/settings`} onClick={() => sfx.click()} size="lg" press className="w-full border-2 border-navy">
            <SettingsIcon className="size-5" />
            Settings
          </ButtonLink>
        </div>
      </div>
    </PageLayout>
  );
}
