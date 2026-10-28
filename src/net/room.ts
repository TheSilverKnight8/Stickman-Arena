import Peer, { type DataConnection, type PeerOptions } from 'peerjs';
import type { GameId } from '../config';

// Rooms: the creator's browser registers a name made from the room code with
// the free PeerJS signaling server; the other player connects to that name.
// After that, game messages go directly between the two browsers over WebRTC.
// No accounts, no database, nothing stored.

/** Letters and digits that cannot be mistaken for each other: no 0/O, no 1/I. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

/** No message (game or heartbeat) for this long means the other player is gone. */
const SILENCE_LIMIT_MS = 6000;
const HEARTBEAT_MS = 1000;
const CONNECT_TIMEOUT_MS = 15000;

export function makeCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Cleans up a typed code. Returns null if it cannot be a room code. */
export function normalizeCode(input: string): string | null {
  const c = input.toUpperCase().replace(/[\s-]/g, '');
  if (c.length !== CODE_LENGTH) return null;
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null;
  return c;
}

const peerName = (game: GameId, code: string) => `stickman-arena-${game}-${code}`;

function peerOptions(): PeerOptions {
  // For testing on one computer: a local PeerJS server (npm run peer) set through
  // VITE_PEER_HOST / VITE_PEER_PORT. The live app uses the free PeerJS cloud server.
  const host = import.meta.env.VITE_PEER_HOST as string | undefined;
  const opts: PeerOptions = { debug: 0 };
  if (host) {
    opts.host = host;
    opts.port = Number(import.meta.env.VITE_PEER_PORT ?? 9000);
    opts.path = '/';
    opts.secure = false;
  }
  if (import.meta.env.VITE_PEER_NO_ICE === '1') opts.config = { iceServers: [] };
  return opts;
}

export type RoomMessage = { t: string; [key: string]: unknown };

export interface RoomHandlers {
  /** A player joined (host only). */
  onJoin?(peerId: string): void;
  /** A player left or lost connection. For a guest, this means the room is gone. */
  onLeave?(peerId: string, reason: 'left' | 'lost'): void;
  onMessage?(peerId: string, msg: RoomMessage): void;
  /** The connection to the signaling server dropped (only matters for new players joining). */
  onSignalingLost?(): void;
}

export class RoomError extends Error {}

interface Link {
  conn: DataConnection;
  lastHeard: number;
}

export class Room {
  readonly links = new Map<string, Link>();
  private beat: number | undefined;
  private closed = false;

  private constructor(
    readonly role: 'host' | 'guest',
    readonly game: GameId,
    readonly code: string,
    private readonly peer: Peer,
    private readonly handlers: RoomHandlers,
    private readonly maxGuests: number,
  ) {
    this.beat = window.setInterval(() => this.heartbeat(), HEARTBEAT_MS);
    peer.on('disconnected', () => {
      if (this.closed) return;
      this.handlers.onSignalingLost?.();
      // The game connections do not need the signaling server; reconnect for new joiners.
      window.setTimeout(() => !this.closed && !this.peer.destroyed && this.peer.reconnect(), 1500);
    });
  }

  /** Creates a room with a new code. Tries a few codes in case one is taken. */
  static async host(game: GameId, maxGuests: number, handlers: RoomHandlers): Promise<Room> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      const peer = new Peer(peerName(game, code), peerOptions());
      try {
        await opened(peer);
      } catch (e) {
        peer.destroy();
        lastError = e;
        if ((e as { type?: string }).type === 'unavailable-id') continue;
        throw new RoomError(signalingMessage(e));
      }
      const room = new Room('host', game, code, peer, handlers, maxGuests);
      peer.on('connection', (conn) => room.accept(conn));
      return room;
    }
    throw new RoomError(signalingMessage(lastError));
  }

  /** Joins the room with this code. */
  static async join(game: GameId, code: string, handlers: RoomHandlers): Promise<Room> {
    const peer = new Peer(peerOptions());
    try {
      await opened(peer);
    } catch (e) {
      peer.destroy();
      throw new RoomError(signalingMessage(e));
    }
    const hostId = peerName(game, code);
    const conn = peer.connect(hostId, { reliable: true, serialization: 'json' });
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new RoomError('The room did not answer. Check the code, or try again.')), CONNECT_TIMEOUT_MS);
        const fail = (e: unknown) => {
          window.clearTimeout(timer);
          const type = (e as { type?: string }).type;
          reject(new RoomError(type === 'peer-unavailable' ? `There is no room with the code ${code}.` : signalingMessage(e)));
        };
        peer.once('error', fail);
        conn.once('error', fail);
        // The host answers with "welcome" or "full".
        conn.on('data', (d) => {
          const msg = d as RoomMessage;
          if (msg?.t === 'welcome') {
            window.clearTimeout(timer);
            resolve();
          } else if (msg?.t === 'full') {
            window.clearTimeout(timer);
            reject(new RoomError('That room already has its players.'));
          }
        });
      });
    } catch (e) {
      peer.destroy();
      throw e;
    }
    conn.removeAllListeners('data');
    const room = new Room('guest', game, code, peer, handlers, 0);
    room.attach(hostId, conn);
    return room;
  }

  private accept(conn: DataConnection) {
    conn.on('open', () => {
      if (this.closed) return conn.close();
      if (this.links.size >= this.maxGuests) {
        conn.send({ t: 'full' });
        window.setTimeout(() => conn.close(), 500);
        return;
      }
      this.attach(conn.peer, conn);
      conn.send({ t: 'welcome' });
      this.handlers.onJoin?.(conn.peer);
    });
  }

  private attach(peerId: string, conn: DataConnection) {
    this.links.set(peerId, { conn, lastHeard: performance.now() });
    conn.on('data', (d) => {
      const link = this.links.get(peerId);
      if (!link) return;
      link.lastHeard = performance.now();
      const msg = d as RoomMessage;
      if (!msg || typeof msg.t !== 'string' || msg.t === 'hb') return;
      if (msg.t === 'bye') return this.drop(peerId, 'left');
      this.handlers.onMessage?.(peerId, msg);
    });
    conn.on('close', () => this.drop(peerId, 'lost'));
    conn.on('error', () => this.drop(peerId, 'lost'));
    // A dead connection can take a long time to report "close"; the heartbeat and ICE state catch it sooner.
    const pc = conn.peerConnection;
    pc?.addEventListener('iceconnectionstatechange', () => {
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') this.drop(peerId, 'lost');
    });
  }

  private drop(peerId: string, reason: 'left' | 'lost') {
    const link = this.links.get(peerId);
    if (!link) return;
    this.links.delete(peerId);
    link.conn.close();
    if (!this.closed) this.handlers.onLeave?.(peerId, reason);
  }

  private heartbeat() {
    const now = performance.now();
    for (const [id, link] of this.links) {
      if (now - link.lastHeard > SILENCE_LIMIT_MS) this.drop(id, 'lost');
      else if (link.conn.open) link.conn.send({ t: 'hb' });
    }
  }

  send(peerId: string, msg: RoomMessage) {
    const link = this.links.get(peerId);
    if (link?.conn.open) link.conn.send(msg);
  }

  broadcast(msg: RoomMessage) {
    for (const id of this.links.keys()) this.send(id, msg);
  }

  get peerIds() {
    return [...this.links.keys()];
  }

  /** Leaves the room. Tells the others first, so they know it was on purpose. */
  close() {
    if (this.closed) return;
    this.closed = true;
    window.clearInterval(this.beat);
    for (const link of this.links.values()) if (link.conn.open) link.conn.send({ t: 'bye' });
    const links = [...this.links.values()];
    this.links.clear();
    // Give the goodbye a moment to go out before the connection closes.
    window.setTimeout(() => {
      links.forEach((l) => l.conn.close());
      this.peer.destroy();
    }, 250);
  }
}

function opened(peer: Peer) {
  return new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject({ type: 'timeout' }), CONNECT_TIMEOUT_MS);
    peer.once('open', () => {
      window.clearTimeout(timer);
      resolve();
    });
    peer.once('error', (e) => {
      window.clearTimeout(timer);
      reject(e);
    });
  });
}

function signalingMessage(e: unknown): string {
  const type = (e as { type?: string } | undefined)?.type;
  if (type === 'browser-incompatible') return 'This browser cannot make direct connections (WebRTC).';
  if (type === 'network' || type === 'server-error' || type === 'socket-error' || type === 'socket-closed' || type === 'timeout')
    return 'Could not reach the room server. Check the internet connection and try again.';
  if (type === 'unavailable-id') return 'Could not get a free room code. Try again.';
  return 'Something went wrong connecting. Try again.';
}
