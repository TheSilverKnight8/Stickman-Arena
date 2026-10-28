import type { StageDef, StageId } from './types';

// Five stages. Each has the same flat base (a solid slab, top at y = 0).
// One is the base alone; the other four have 1 to 4 pass-through platforms.
// Units: a standing fighter is about 100 tall.

const MAIN = { x1: -380, x2: 380, bottom: -48 };
const BLAST = { left: -1150, right: 1150, top: 1000, bottom: -650 };
const SPAWNS: [number, number][] = [
  [-200, 0],
  [200, 0],
  [-70, 0],
  [70, 0],
];

export const STAGES: Record<StageId, StageDef> = {
  flatline: {
    id: 'flatline',
    name: 'Flatline',
    about: 'The flat base and nothing else.',
    main: MAIN,
    plats: [],
    blast: BLAST,
    spawns: SPAWNS,
  },
  lookout: {
    id: 'lookout',
    name: 'Lookout',
    about: 'One platform over the middle.',
    main: MAIN,
    plats: [{ x1: -115, x2: 115, y: 150 }],
    blast: BLAST,
    spawns: SPAWNS,
  },
  'twin-decks': {
    id: 'twin-decks',
    name: 'Twin Decks',
    about: 'Two platforms side by side.',
    main: MAIN,
    plats: [
      { x1: -255, x2: -65, y: 135 },
      { x1: 65, x2: 255, y: 135 },
    ],
    blast: BLAST,
    spawns: SPAWNS,
  },
  scaffold: {
    id: 'scaffold',
    name: 'Scaffold',
    about: 'Two low platforms and one high one in the middle.',
    main: MAIN,
    plats: [
      { x1: -275, x2: -115, y: 120 },
      { x1: 115, x2: 275, y: 120 },
      { x1: -80, x2: 80, y: 230 },
    ],
    blast: BLAST,
    spawns: SPAWNS,
  },
  rafters: {
    id: 'rafters',
    name: 'Rafters',
    about: 'Four platforms: two low at the edges, two higher inside.',
    main: MAIN,
    plats: [
      { x1: -330, x2: -200, y: 100 },
      { x1: 200, x2: 330, y: 100 },
      { x1: -170, x2: -45, y: 200 },
      { x1: 45, x2: 170, y: 200 },
    ],
    blast: BLAST,
    spawns: SPAWNS,
  },
};

export const STAGE_IDS = Object.keys(STAGES) as StageId[];
