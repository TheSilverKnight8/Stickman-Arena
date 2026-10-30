import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertTriangle, DoorClosed, Loader2, Shuffle, Wifi } from 'lucide-react';
import { notify } from '../../components/dialogs';
import { PageLayout, PageTitle, PlayLayout } from '../../components/Layout';
import { PlayerRow, RoomCodeCard, useLeaveOnUnmount } from '../../components/RoomBits';
import { Button, Card, cx } from '../../components/ui';
import { GAMES } from '../../config';
import { sfx } from '../../lib/audio/sfx';
import { useMusic } from '../../lib/audio/useMusic';
import { useStore } from '../../lib/store';
import { MatchIntro, ResultCard } from '../FighterPages';
import {
  afterDisconnect,
  clearFighterNotice,
  fighterRoom,
  leaveFighterRoom,
  matchFinished,
  pickFighter,
  setFighterReady,
  voteStage,
  type FighterRoomState,
  type OnlineDriver,
  type Vote,
} from '../online';
import type { PlayerLabel } from '../render/scene';
import { CHARS } from '../sim/chars';
import { STAGES, STAGE_IDS } from '../sim/stages';
import type { MatchState } from '../sim/types';
import { CharacterGrid, CharacterInfo, type Pick } from './CharacterGrid';
import { ControlsHelp } from './Controls';
import { FightView } from './FightView';
import { StagePreview } from './StagePicker';

// The online Platfighter room: character select → stage select → match →
// back to character select (spec).

const PATH = GAMES.fighter.path;
const BACK_SECONDS = 5;

export function FighterRoomPage() {
  const room = useStore(fighterRoom);
  const navigate = useNavigate();

  // Leaving the room screen (back button, home link) leaves the room.
  useLeaveOnUnmount(leaveFighterRoom);

  useEffect(() => {
    if (room.status !== 'closed') return;
    if (room.notice) notify(room.notice, 'warn');
    clearFighterNotice();
    navigate(PATH, { replace: true });
  }, [room.status, room.notice, navigate]);

  const leave = () => {
    sfx.back();
    leaveFighterRoom();
    navigate(PATH);
  };

  if (room.status === 'open' && room.lobby.phase === 'match' && room.driver) return <OnlineMatch key={room.driver.config.match} room={room} driver={room.driver} />;

  if (room.status === 'connecting')
    return (
      <PageLayout back={{ to: PATH, label: 'Platfighter' }}>
        <div className="flex items-center gap-3 py-16 text-lg text-muted">
          <Loader2 className="size-6 animate-spin" />
          {room.role === 'host' ? 'Creating a room…' : `Joining room ${room.code}…`}
        </div>
      </PageLayout>
    );

  if (room.status === 'error')
    return (
      <PageLayout back={{ to: PATH, label: 'Platfighter' }}>
        <PageTitle eyebrow="Platfighter · Online" title={room.role === 'host' ? 'Could not create a room' : 'Could not join'} />
        <p className="mt-6 flex max-w-xl items-start gap-2 rounded-xl border border-warn/35 bg-warn/10 p-4 text-warn">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          {room.error}
        </p>
        <Button className="mt-6" press onClick={leave}>
          Back to Platfighter
        </Button>
      </PageLayout>
    );

  return <Lobby room={room} onLeave={leave} />;
}

// ---------------------------------------------------------------- lobby

function Lobby({ room, onLeave }: { room: FighterRoomState; onLeave: () => void }) {
  useMusic('menu');
  const here = room.lobby.seats[1 - room.mySeat]?.here ?? false;
  const wasHere = useRef(here);
  useEffect(() => {
    if (room.role === 'host' && here && !wasHere.current) sfx.join();
    wasHere.current = here;
  }, [here, room.role]);
  useEffect(() => {
    if (!room.notice || room.status !== 'open') return;
    notify(room.notice, 'warn');
    clearFighterNotice();
  }, [room.notice, room.status]);

  if (room.lobby.phase === 'chars') return <CharacterSelect room={room} onLeave={onLeave} />;
  return <StageSelect room={room} />;
}

function CharacterSelect({ room, onLeave }: { room: FighterRoomState; onLeave: () => void }) {
  const me = room.lobby.seats[room.mySeat];
  const them = room.lobby.seats[1 - room.mySeat];
  return (
    <PageLayout back={{ to: PATH, label: 'Platfighter' }}>
      <PageTitle eyebrow="Platfighter · Online room" title="Character select">
        Pick a fighter and press Ready. When you are both ready, you vote for a stage.
      </PageTitle>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          <Card className="p-4 sm:p-5">
            <CharacterGrid value={me.pick} onChange={(p) => pickFighter(p)} disabled={me.ready} />
          </Card>
          <Card className="p-5">
            <CharacterInfo pick={me.pick} />
          </Card>
        </div>
        <div className="space-y-4">
          <RoomCodeCard code={room.code} host={room.role === 'host'} />
          <Card className="p-5">
            <p className="label-caps text-muted">Players</p>
            <ul className="mt-3 space-y-2">
              <PlayerRow name="You" status={pickStatus(me.pick, me.ready)} ready={me.ready} />
              <PlayerRow name="Opponent" status={them.here ? pickStatus(them.pick, them.ready) : 'Waiting for a player to join'} ready={them.ready} waiting={!them.here} />
            </ul>
          </Card>
          <Button
            variant={me.ready ? 'secondary' : 'primary'}
            size="xl"
            press
            className="w-full"
            disabled={!me.pick}
            onClick={() => {
              sfx.click();
              setFighterReady(!me.ready);
            }}
          >
            {me.ready ? 'Not ready' : 'Ready'}
          </Button>
          {!me.pick && <p className="text-center text-sm text-muted">Pick a fighter first.</p>}
          <Button variant="danger" size="md" className="w-full" onClick={onLeave}>
            <DoorClosed className="size-4" />
            Leave room
          </Button>
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

function pickStatus(pick: Pick | null, ready: boolean) {
  const name = pick === 'random' ? 'Random' : pick ? CHARS[pick].name : null;
  if (!name) return 'Choosing a fighter';
  return ready ? `Ready · ${name}` : `Choosing · ${name}`;
}

function StageSelect({ room }: { room: FighterRoomState }) {
  const l = room.lobby;
  const me = l.seats[room.mySeat];
  const them = l.seats[1 - room.mySeat];
  const vote = (v: Vote) => {
    sfx.click();
    voteStage(v);
  };
  return (
    <PageLayout back={{ to: PATH, label: 'Platfighter' }}>
      <PageTitle eyebrow="Platfighter · Online room" title="Stage select">
        Vote for a stage. If you both pick the same one, you play it; if not, one of the two is picked at random. Random is a vote for any stage.
      </PageTitle>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Stages">
          {STAGE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={me.vote === id}
              disabled={l.phase !== 'stages'}
              onClick={() => vote(id)}
              className={cx(
                'flex flex-col rounded-2xl border-2 bg-surface p-2 text-left transition',
                me.vote === id ? 'border-accent shadow-pop -translate-y-0.5' : 'border-line hover:border-navy/50',
              )}
            >
              <StagePreview stage={STAGES[id]} className="w-full rounded-lg bg-[#f6e7cf]" />
              <span className="mt-2 px-1 font-display text-lg uppercase leading-none">{STAGES[id].name}</span>
              <span className="mt-1 px-1 text-xs text-muted">{STAGES[id].about}</span>
            </button>
          ))}
          <button
            type="button"
            role="radio"
            aria-checked={me.vote === 'random'}
            disabled={l.phase !== 'stages'}
            onClick={() => vote('random')}
            className={cx(
              'flex flex-col rounded-2xl border-2 border-dashed bg-surface p-2 text-left transition',
              me.vote === 'random' ? 'border-accent shadow-pop -translate-y-0.5' : 'border-line hover:border-navy/50',
            )}
          >
            <span className="flex aspect-[2/1] w-full items-center justify-center rounded-lg bg-raised">
              <Shuffle className="size-10 text-accent" />
            </span>
            <span className="mt-2 px-1 font-display text-lg uppercase leading-none">Random</span>
            <span className="mt-1 px-1 text-xs text-muted">Any of the five stages.</span>
          </button>
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="label-caps text-muted">Players</p>
            <ul className="mt-3 space-y-2">
              <PlayerRow name={`You · ${CHARS[me.char!].name}`} status={me.vote ? `Voted ${voteName(me.vote)}` : 'Choosing a stage'} ready={!!me.vote} />
              <PlayerRow name={`Opponent · ${CHARS[them.char!].name}`} status={them.vote ? 'Has voted' : 'Choosing a stage'} ready={!!them.vote} />
            </ul>
          </Card>
          <p className="text-sm text-muted">You can change your vote until your opponent has voted too.</p>
        </div>
      </div>
      {l.phase === 'reveal' && <Reveal room={room} />}
    </PageLayout>
  );
}

const voteName = (v: Vote) => (v === 'random' ? 'Random' : STAGES[v].name);

/** Both votes, then the stage that will be played. */
function Reveal({ room }: { room: FighterRoomState }) {
  const l = room.lobby;
  const [chosen, setChosen] = useState(false);
  useEffect(() => {
    sfx.shuffle();
    const t = window.setTimeout(() => {
      setChosen(true);
      sfx.stand();
    }, 1100);
    return () => window.clearTimeout(t);
  }, []);
  const order = [room.mySeat, 1 - room.mySeat];
  return (
    <div className="fixed inset-0 z-40 flex animate-fade items-center justify-center bg-navy/35 p-4">
      <div className="w-full max-w-lg animate-rise rounded-3xl border-2 border-navy bg-surface p-6 text-center shadow-pop">
        <p className="label-caps text-accent">Stage vote</p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {order.map((seat) => {
            const v = l.seats[seat].vote!;
            const became = l.votedStages[seat]!;
            return (
              <div key={seat} className="rounded-xl border border-line bg-raised p-3">
                <p className="label-caps text-muted">{seat === room.mySeat ? 'You' : 'Opponent'}</p>
                <p className="mt-1 font-display text-lg uppercase leading-tight">{voteName(v)}</p>
                {v === 'random' && <p className="text-xs text-muted">became {STAGES[became].name}</p>}
              </div>
            );
          })}
        </div>
        <div className={cx('mt-5 transition-opacity duration-300', chosen ? 'opacity-100' : 'opacity-0')}>
          <StagePreview stage={STAGES[l.stage!]} className="mx-auto w-64 max-w-full rounded-lg bg-[#f6e7cf]" />
          <h2 className="mt-3 text-4xl">{STAGES[l.stage!].name}</h2>
          <p className="text-sm text-muted">{l.votedStages[0] === l.votedStages[1] ? 'Same stage: that is the one.' : 'Different stages: one of the two, at random.'}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- match

function OnlineMatch({ room, driver }: { room: FighterRoomState; driver: OnlineDriver }) {
  const navigate = useNavigate();
  const [result, setResult] = useState<MatchState | null>(null);
  const labels = useMemo<PlayerLabel[]>(() => [0, 1].map((seat) => ({ name: seat === room.mySeat ? 'You' : 'Opponent', you: seat === room.mySeat })), [room.mySeat]);
  const host = room.role === 'host';

  const overlay = room.disconnected ? (
    <ResultCard
      state={driver.state}
      labels={labels}
      onBack={() => {
        sfx.click();
        afterDisconnect();
      }}
      backLabel={host ? 'Back to the room' : 'Back to Platfighter'}
    />
  ) : result ? (
    <ResultCard state={result} labels={labels} footer={<p className="text-sm text-muted">Back to character select in {BACK_SECONDS} seconds…</p>} />
  ) : (
    <WaitingNotice driver={driver} />
  );

  return (
    <PlayLayout>
      <FightView
        driver={driver}
        labels={labels}
        mySlot={room.mySeat}
        pausable={false}
        leaveText="You leave the room, and the match ends in a draw for both players."
        onLeave={() => {
          sfx.back();
          leaveFighterRoom();
          notify('You left the match, so it ends in a draw.');
          navigate(PATH);
        }}
        onOver={(s) => {
          setResult(s);
          if (host) matchFinished();
        }}
        overlay={overlay}
      />
      <MatchIntro chars={driver.config.chars} stage={driver.config.stage} />
    </PlayLayout>
  );
}

/** Shown while this device is held up waiting for the other player's buttons. */
function WaitingNotice({ driver }: { driver: OnlineDriver }) {
  const [waiting, setWaiting] = useState(false);
  useEffect(() => {
    const t = window.setInterval(() => setWaiting(driver.rollback.stalled > 20), 200);
    return () => window.clearInterval(t);
  }, [driver]);
  if (!waiting) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
      <p className="flex items-center gap-2 rounded-xl border-2 border-navy bg-surface/95 px-4 py-2 font-display text-lg uppercase shadow-pop">
        <Wifi className="size-5 animate-pulse text-accent" />
        Waiting for your opponent…
      </p>
    </div>
  );
}
