import type { DiffRule } from '../types.js';

export const ResponseRemoved: DiffRule = () => ({
  Response(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Response was removed.' });
  },
});

export const MediaTypeRemoved: DiffRule = () => ({
  MediaType(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Media type was removed.' });
  },
});

// Dropping every header collapses into a single change on the map, dropping one lands on
// the header itself.
export const ResponseHeaderRemoved: DiffRule = () => ({
  Header(change, { report, direction }) {
    if (change.kind === 'removed' && direction === 'response') {
      report({ message: 'A response header was removed.' });
    }
  },
  HeadersMap(change, { report, direction }) {
    if (change.kind === 'removed' && direction === 'response') {
      report({ message: 'The response headers were removed.' });
    }
  },
});
