import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { PageLayout } from '../components/Layout';
import { APP_NAME, GAMES } from '../config';
import { FighterArt, PazaakArt } from '../graphics/GameArt';
import { sfx } from '../lib/audio/sfx';
import { useMusic } from '../lib/audio/useMusic';

export function Home() {
  useMusic('menu');
  return (
    <PageLayout home>
      <div className="animate-rise">
        <p className="label-caps text-accent">Pick a game</p>
        <h1 className="mt-2 text-5xl sm:text-6xl lg:text-7xl">{APP_NAME}</h1>
        <p className="mt-3 max-w-xl text-muted">Play a friend online with a room code, or take on the CPU.</p>
      </div>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <GameButton to={GAMES.fighter.path} name={GAMES.fighter.name} blurb="Knock your opponent off the stage. Three stocks, three minutes." art={<FighterArt className="h-full w-full" />} />
        <GameButton to={GAMES.pazaak.path} name={GAMES.pazaak.name} blurb="Get closer to 20 than your opponent without going over." art={<PazaakArt className="h-full w-full" />} />
      </div>
    </PageLayout>
  );
}

function GameButton({ to, name, blurb, art }: { to: string; name: string; blurb: string; art: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={() => sfx.click()}
      className="press group flex flex-col overflow-hidden rounded-3xl border-2 border-navy bg-surface [--lift:7px] animate-rise"
      style={{ animationDelay: '80ms' }}
    >
      <div className="aspect-[16/10] w-full bg-raised p-4 transition group-hover:bg-[color-mix(in_srgb,var(--raised)_70%,var(--accent)_8%)]">{art}</div>
      <div className="flex items-center gap-3 border-t-2 border-navy px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl sm:text-4xl">{name}</h2>
          <p className="mt-1 text-sm text-muted">{blurb}</p>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-on-accent transition group-hover:translate-x-0.5">
          <ChevronRight className="size-6" />
        </span>
      </div>
    </Link>
  );
}
