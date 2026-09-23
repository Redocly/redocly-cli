import type { DiffRule } from '../types.js';

// Dropping every header collapses into a single change on the map, dropping one lands on
// the header itself.
export const ResponseHeaderRemoved: DiffRule = () => ({
  Header(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('response')) {
      report({ message: 'A response header was removed.' });
    }
  },
  HeadersMap(change, { report, directions }) {
    if (change.kind === 'removed' && directions.includes('response')) {
      report({ message: 'The response headers were removed.' });
    }
  },
});
