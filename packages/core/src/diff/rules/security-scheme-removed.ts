import type { DiffRule } from '../types.js';
import { nameOf } from './utils.js';

export const SecuritySchemeRemoved: DiffRule = () => ({
  SecurityScheme(change, { report }) {
    if (change.kind === 'removed')
      report({ message: `Security scheme \`${nameOf(change.node)}\` was removed.` });
  },
});
