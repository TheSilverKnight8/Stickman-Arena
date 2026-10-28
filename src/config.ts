export const APP_NAME = 'Stickman Arena';

export type GameId = 'fighter' | 'pazaak';

export const GAMES: Record<GameId, { name: string; path: string }> = {
  fighter: { name: 'Platfighter', path: '/fighter' },
  pazaak: { name: 'Pazaak', path: '/pazaak' },
};
