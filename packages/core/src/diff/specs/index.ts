import type { SpecMajorVersion } from '../../oas-types.js';
import type { Directions, Identities } from '../types.js';
import { async3Directions } from './async3.js';
import { oas3Directions, oas3Identities } from './oas3.js';

/** A family missing here is still compared, by its structure alone, and never judged. */
export const diffSpecs: Partial<
  Record<SpecMajorVersion, { identities: Identities; directions: Directions }>
> = {
  oas3: { identities: oas3Identities, directions: oas3Directions },
  // Channels, messages and operations are named maps, so a node's own key is its identity.
  async3: { identities: {}, directions: async3Directions },
};
