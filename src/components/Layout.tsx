import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';
import { AppMark } from '../graphics/AppMark';
import { CroswellLogo, CroswellMark } from '../graphics/Logo';
import { APP_NAME } from '../config';
import { sfx } from '../lib/audio/sfx';
import { cx } from './ui';

// Two frames, following the portal and Synth Studio:
//  - PageLayout for menus: stripes at the top, and the logo in the gap left of
//    the bottom stripes (the full Croswell Industries logo on Home, the C on
//    every other screen).
//  - PlayLayout for screens where a match is played: the whole screen is the
//    game, with a slim stripe and the C at the bottom.

export function PageLayout({ children, home = false, back }: { children: ReactNode; home?: boolean; back?: { to: string; label: string } }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-4 pt-[env(safe-area-inset-top)] box-content">
        <Link to="/" className="mr-2 flex items-center gap-2.5" onClick={() => sfx.back()}>
          <AppMark size={32} />
          <span className="font-display text-xl uppercase leading-none tracking-wide">{APP_NAME}</span>
        </Link>
        <div className="flex-1" />
        {back && (
          <Link to={back.to} onClick={() => sfx.back()} className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 font-display text-[1.0625rem] uppercase tracking-[0.05em] text-ink transition hover:bg-raised">
            <ChevronLeft className="size-4" />
            {back.label}
          </Link>
        )}
      </header>
      <div className="stripes stripes-tl mt-3 shrink-0 lg:mt-5" aria-hidden />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-10 lg:pb-14 lg:pt-8">{children}</main>
      <footer className="mb-5 pb-[env(safe-area-inset-bottom)]">
        {/* Home on phones: the full logo is too wide for the gap, so it sits above the stripes. */}
        {home && <CroswellLogo className="mb-5 ml-4 w-44 text-ink sm:ml-6 lg:hidden" />}
        <div className="relative">
          <div className="stripes stripes-br" aria-hidden />
          {/* The logo sits in the gap between the left edge and the bars, centered.
              The longest bar reaches 77% of the way, which leaves 23%. */}
          <div className="absolute inset-y-0 left-0 flex w-[23%] items-center justify-center">
            {home ? <CroswellLogo className="hidden w-[85%] max-w-[15rem] text-ink lg:block" /> : <CroswellMark className="h-9 text-ink lg:h-11" />}
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PlayLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="game-surface flex h-dvh flex-col overflow-hidden">
      <main className={cx('relative min-h-0 flex-1 pt-[env(safe-area-inset-top)]', className)}>{children}</main>
      <footer className="relative shrink-0 border-t border-line bg-bg py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="stripes stripes-br stripes-sm" aria-hidden />
        <div className="absolute inset-y-0 left-0 flex w-[23%] items-center justify-center">
          <CroswellMark className="h-4 text-ink" />
        </div>
      </footer>
    </div>
  );
}

/** Eyebrow + big title, as on the portal's pages. */
export function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="animate-rise">
      <p className="label-caps text-accent">{eyebrow}</p>
      <h1 className="mt-2 text-5xl lg:text-6xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-muted">{children}</div>}
    </div>
  );
}
