import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, UserRound } from 'lucide-react';
import { sfx } from '../lib/audio/sfx';
import { notify } from './dialogs';
import { Button, Card, cx } from './ui';

// Pieces shared by the Pazaak and Platfighter rooms.

/**
 * Runs `fn` when the screen really goes away. React mounts screens twice in
 * development; a quick remount cancels the call.
 */
export function useLeaveOnUnmount(fn: () => void) {
  const pending = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(pending.current);
    return () => {
      pending.current = window.setTimeout(fn, 0);
    };
  }, [fn]);
}

export function RoomCodeCard({ code, host }: { code: string; host: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      sfx.click();
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      notify('Could not copy. Read the code out instead.', 'warn');
    }
  };
  return (
    <Card className="p-5">
      <p className="label-caps text-muted">{host ? 'Room code: share it with your opponent' : 'Room code'}</p>
      <div className="mt-3 flex justify-between gap-1" aria-label={`Room code ${code.split('').join(' ')}`}>
        {code.split('').map((ch, i) => (
          <span key={i} className="flex h-14 flex-1 items-center justify-center rounded-lg border-2 border-navy bg-raised font-mono text-3xl font-semibold text-ink">
            {ch}
          </span>
        ))}
      </div>
      {host && (
        <Button size="sm" press className="mt-3 w-full" onClick={() => void copy()}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      )}
    </Card>
  );
}

export function PlayerRow({ name, status, ready, waiting = false }: { name: string; status: string; ready: boolean; waiting?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <span className={cx('flex size-9 items-center justify-center rounded-lg', ready ? 'bg-accent text-on-accent' : 'bg-raised text-muted')}>
        {waiting ? <Loader2 className="size-4 animate-spin" /> : ready ? <Check className="size-5" /> : <UserRound className="size-5" />}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-lg uppercase leading-tight">{name}</span>
        <span className="block text-sm text-muted">{status}</span>
      </span>
    </li>
  );
}
