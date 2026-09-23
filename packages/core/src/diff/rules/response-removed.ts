import type { DiffRule } from '../types.js';

export const ResponseRemoved: DiffRule = () => ({
  Response(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Response was removed.' });
  },
});
