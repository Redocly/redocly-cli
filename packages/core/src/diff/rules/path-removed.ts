import type { DiffRule } from '../types.js';

export const PathRemoved: DiffRule = () => ({
  PathItem(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Path was removed.' });
  },
});
