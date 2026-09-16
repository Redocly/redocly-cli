import type { DiffRule } from '../types.js';

// Dropping every server collapses into a single change on the map, dropping one lands on
// the server itself.
export const ServerRemoved: DiffRule = () => ({
  Server(change, { report }) {
    if (change.kind === 'removed') report({ message: 'The server was removed.' });
  },
  ServerMap(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Every server was removed.' });
  },
});
