import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, DoorClosed, Loader2, Play } from 'lucide-react';
import { confirmDialog, notify } from '../../components/dialogs';
import { PageLayout, PageTitle, PlayLayout } from '../../components/Layout';
import { Button, Card, cx } from '../../components/ui';
import { GAMES } from '../../config';
import { sfx } from '../../lib/audio/sfx';
import { useMusic } from '../../lib/audio/useMusic';
import { useStore } from '../../lib/store';
import { GameHome } from '../../pages/GameHome';
import { DECK_SIZE } from '../cards';
import { CPU_LEVELS, type CpuLevel } from '../cpu';
import {
  MATCH_END_SECONDS,
  clearNotice,
  cpuAct,
  cpuGame,
  createRoom,
  dismissDisconnect,
  endCpuMatch,
  joinRoom,
  leaveRoom,
  myDeck,
  pazaakRoom,
  roomAct,
  setReady,
  startCpuMatch,
} from '../session';
import { PlayerRow, RoomCodeCard, useLeaveOnUnmount } from '../../components/RoomBits';
import { DeckBuilder } from './DeckBuilder';
import { PazaakTable } from './Table';

const PATH = GAMES.pazaak.path;

export function PazaakHome() {
  useMusic('menu');
  return (
    <GameHome
      game="pazaak"
      about={<>Get a higher total than your opponent without going over 20. Win 3 sets to win the match. Each turn you have 20 seconds.</>}
      onCreate={() => void createRoom()}
      onJoin={(code) => void joinRoom(code)}
    />
  );
}

// ---------------------------------------------------------------- CPU

export function PazaakCpu() {
  const game = useStore(cpuGame);
  const deck = useStore(myDeck);
  const navigate = useNavigate();
  useLeaveOnUnmount(endCpuMatch);

  if (game.table)
    return (
      <PlayLayout>
        <PazaakTable
          view={game.table}
          onAct={cpuAct}
          onLeave={async () => {
            if (game.table?.state.phase !== 'matchOver' && !(await confirmDialog({ title: 'Leave the match?', body: 'The match ends here.', confirm: 'Leave match' }))) return;
            endCpuMatch();
          }}
          matchEnd={
            <Button variant="primary" size="lg" press onClick={endCpuMatch}>
              Back to deck selection
            </Button>
          }
          disconnectEnd={null}
        />
      </PlayLayout>
    );

  return <CpuSetup deck={deck} level={game.level} onBack={() => navigate(PATH)} />;
}

function CpuSetup({ deck, level, onBack }: { deck: string[]; level: CpuLevel; onBack: () => void }) {
  useMusic('menu');
  const ready = deck.length === DECK_SIZE;
  return (
    <PageLayout back={{ to: PATH, label: 'Pazaak' }}>
      <PageTitle eyebrow="Pazaak · Play the CPU" title="Build your deck">
        Pick 10 cards for your side deck, or tap Random. Four of them are dealt to your hand at the start of the match, and each can be played once.
      </PageTitle>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card className="p-5">
          <DeckBuilder deck={deck} onChange={(d) => myDeck.set(d)} />
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="label-caps text-muted">CPU</p>
            <div className="mt-3 grid gap-2">
              {(Object.keys(CPU_LEVELS) as CpuLevel[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    sfx.click();
                    cpuGame.set((g) => ({ ...g, level: l }));
                  }}
                  className={cx('rounded-xl border-2 p-3 text-left transition', l === level ? 'border-accent bg-accent/8' : 'border-line hover:border-navy/40')}
                  aria-pressed={l === level}
                >
                  <span className="font-display text-xl uppercase">{CPU_LEVELS[l].name}</span>
                  <span className="mt-0.5 block text-sm text-muted">{CPU_LEVELS[l].about}</span>
                </button>
              ))}
            </div>
          </Card>
          <Button
            variant="primary"
            size="xl"
            press
            className="w-full"
            disabled={!ready}
            onClick={() => {
              sfx.click();
              startCpuMatch();
            }}
          >
            <Play className="size-6" />
            Start match
          </Button>
          {!ready && <p className="text-center text-sm text-muted">Your deck needs {DECK_SIZE - deck.length} more.</p>}
          <Button variant="ghost" size="sm" className="w-full" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}

// ---------------------------------------------------------------- online room

export function PazaakRoomPage() {
  const room = useStore(pazaakRoom);
  const deck = useStore(myDeck);
  const navigate = useNavigate();

  // Leaving the room screen (back button, home link) leaves the room.
  useLeaveOnUnmount(leaveRoom);

  useEffect(() => {
    if (room.status !== 'closed') return;
    if (room.notice) notify(room.notice, 'warn');
    clearNotice();
    navigate(PATH, { replace: true });
  }, [room.status, room.notice, navigate]);

  const leave = async () => {
    const midMatch = room.phase === 'match' && room.table && room.table.state.phase !== 'matchOver' && !room.table.disconnected;
    if (midMatch && !(await confirmDialog({ title: 'Leave the room?', body: 'The match ends in a draw for both players.', confirm: 'Leave room', danger: true }))) return;
    sfx.back();
    leaveRoom();
    if (midMatch) notify('You left the match, so it ends in a draw.');
    navigate(PATH);
  };

  if (room.status === 'open' && room.phase === 'match' && room.table)
    return (
      <PlayLayout>
        <PazaakTable
          view={room.table}
          onAct={roomAct}
          onLeave={() => void leave()}
          matchEnd={<p className="text-sm text-muted">Back to deck selection in {MATCH_END_SECONDS} seconds…</p>}
          disconnectEnd={
            <Button variant="primary" size="lg" press onClick={dismissDisconnect}>
              {room.role === 'host' ? 'Back to the room' : 'Back to Pazaak'}
            </Button>
          }
        />
      </PlayLayout>
    );

  return <RoomLobby room={room} deck={deck} onLeave={() => void leave()} />;
}

function RoomLobby({ room, deck, onLeave }: { room: ReturnType<typeof pazaakRoom.get>; deck: string[]; onLeave: () => void }) {
  useMusic('menu');
  const wasHere = useRef(room.opponentHere);
  useEffect(() => {
    if (room.role === 'host' && room.opponentHere && !wasHere.current) sfx.join();
    wasHere.current = room.opponentHere;
  }, [room.opponentHere, room.role]);
  useEffect(() => {
    if (!room.notice || room.status !== 'open') return;
    notify(room.notice, 'warn');
    clearNotice();
  }, [room.notice, room.status]);

  if (room.status === 'connecting')
    return (
      <PageLayout back={{ to: PATH, label: 'Pazaak' }}>
        <div className="flex items-center gap-3 py-16 text-lg text-muted">
          <Loader2 className="size-6 animate-spin" />
          {room.role === 'host' ? 'Creating a room…' : `Joining room ${room.code}…`}
        </div>
      </PageLayout>
    );

  if (room.status === 'error')
    return (
      <PageLayout back={{ to: PATH, label: 'Pazaak' }}>
        <PageTitle eyebrow="Pazaak · Online" title={room.role === 'host' ? 'Could not create a room' : 'Could not join'} />
        <p className="mt-6 flex max-w-xl items-start gap-2 rounded-xl border border-warn/35 bg-warn/10 p-4 text-warn">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          {room.error}
        </p>
        <Button className="mt-6" press onClick={onLeave}>
          Back to Pazaak
        </Button>
      </PageLayout>
    );

  const deckReady = deck.length === DECK_SIZE;
  return (
    <PageLayout back={{ to: PATH, label: 'Pazaak' }}>
      <PageTitle eyebrow="Pazaak · Online room" title="Deck selection">
        Build your side deck and press Ready. The match starts when both players are ready.
      </PageTitle>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <Card className="p-5">
          <DeckBuilder deck={deck} onChange={(d) => myDeck.set(d)} locked={room.ready} />
        </Card>
        <div className="space-y-4">
          <RoomCodeCard code={room.code} host={room.role === 'host'} />
          <Card className="p-5">
            <p className="label-caps text-muted">Players</p>
            <ul className="mt-3 space-y-2">
              <PlayerRow name="You" status={room.ready ? 'Ready' : 'Choosing a deck'} ready={room.ready} />
              <PlayerRow
                name="Opponent"
                status={!room.opponentHere ? 'Waiting for a player to join' : room.opponentReady ? 'Ready' : 'Choosing a deck'}
                ready={room.opponentReady}
                waiting={!room.opponentHere}
              />
            </ul>
          </Card>
          <Button
            variant={room.ready ? 'secondary' : 'primary'}
            size="xl"
            press
            className="w-full"
            disabled={!deckReady}
            onClick={() => {
              sfx.click();
              setReady(!room.ready);
            }}
          >
            {room.ready ? 'Not ready' : 'Ready'}
          </Button>
          {!deckReady && <p className="text-center text-sm text-muted">Your deck needs {DECK_SIZE - deck.length} more.</p>}
          <Button variant="danger" size="md" className="w-full" onClick={onLeave}>
            <DoorClosed className="size-4" />
            Leave room
          </Button>
        </div>
      </div>
    </PageLayout>
  );
}
