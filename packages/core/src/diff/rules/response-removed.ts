import type { DiffRule } from '../types.js';
import { nameOf } from './utils.js';

export const ResponseRemoved: DiffRule = () => ({
  Response(change, { report }) {
    if (change.kind === 'removed')
      report({ message: `Response \`${nameOf(change.node)}\` was removed.` });
  },
});
