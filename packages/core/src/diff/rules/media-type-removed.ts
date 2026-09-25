import type { DiffRule } from '../types.js';
import { nameOf } from './utils.js';

// Removing every media type lands as one change on the map, removing one lands on the media type.
export const MediaTypeRemoved: DiffRule = () => ({
  MediaType(change, { report }) {
    if (change.kind === 'removed')
      report({ message: `Media type \`${nameOf(change.node)}\` was removed.` });
  },
  MediaTypesMap(change, { report }) {
    if (change.kind === 'removed') report({ message: 'All media types were removed.' });
  },
});
