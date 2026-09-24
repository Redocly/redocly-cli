import type { DiffRule } from '../types.js';
import { nameOf } from './utils.js';

// Dropping every header collapses into a single change on the map, dropping one lands on
// the header itself.
export const ResponseHeaderRemoved: DiffRule = () => ({
  Header(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('response')) {
      report({ message: `Response header \`${nameOf(change.node)}\` was removed.` });
    }
  },
  HeadersMap(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('response')) {
      report({
        message: `All headers of response \`${nameOf(change.node.parent!)}\` were removed.`,
      });
    }
  },
});
