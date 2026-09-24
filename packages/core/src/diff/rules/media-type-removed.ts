import type { DiffRule } from '../types.js';
import { nameOf } from './utils.js';

export const MediaTypeRemoved: DiffRule = () => ({
  MediaType(change, { report }) {
    if (change.kind === 'removed')
      report({ message: `Media type \`${nameOf(change.node)}\` was removed.` });
  },
});
