import type { DiffFamily } from '../rules/index.js';
import type { Directions, Identities } from '../types.js';
import { async3Directions } from './async3.js';
import { oas3Directions, oas3Identities } from './oas3.js';

/** Every family with diff rules; any other family is compared by its structure alone. */
export const diffSpecs: Record<DiffFamily, { identities: Identities; directions: Directions }> = {
  oas3: { identities: oas3Identities, directions: oas3Directions },
  // Channels, messages and operations are named maps, so a node's own key is its identity.
  async3: { identities: {}, directions: async3Directions },
};
