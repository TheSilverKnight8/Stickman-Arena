import type { CharDef, CharId } from '../types';
import { buster } from './buster';
import { fisticuffs } from './fisticuffs';
import { phantom } from './phantom';
import { ranger } from './ranger';
import { spartan } from './spartan';
import { valkyrie } from './valkyrie';

export const CHARS: Record<CharId, CharDef> = { fisticuffs, spartan, ranger, buster, phantom, valkyrie };

/** Order on the character select screen (the spec's table order, then fighters added later). */
export const CHAR_IDS: CharId[] = ['fisticuffs', 'spartan', 'ranger', 'buster', 'phantom', 'valkyrie'];
