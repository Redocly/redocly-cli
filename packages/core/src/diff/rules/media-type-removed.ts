import type { DiffRule } from '../types.js';

export const MediaTypeRemoved: DiffRule = () => ({
  MediaType(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Media type was removed.' });
  },
});
