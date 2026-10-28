import type { CharDef, CharId } from '../types';
import { buster } from './buster';
import { fisticuffs } from './fisticuffs';
import { phantom } from './phantom';
import { ranger } from './ranger';
import { spartan } from './spartan';

export const CHARS: Record<CharId, CharDef> = { fisticuffs, spartan, ranger, buster, phantom };

/** Order on the character select screen (the spec's table order). */
export const CHAR_IDS: CharId[] = ['fisticuffs', 'spartan', 'ranger', 'buster', 'phantom'];
