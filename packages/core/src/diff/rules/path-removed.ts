import type { DiffRule } from '../types.js';
import { nameOf } from './utils.js';

export const PathRemoved: DiffRule = () => ({
  PathItem(change, { report }) {
    if (change.kind === 'removed')
      report({ message: `Path \`${nameOf(change.node)}\` was removed.` });
  },
});
