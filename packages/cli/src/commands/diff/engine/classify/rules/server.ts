import { breaking, type DiffRule } from '../../types.js';

// Registered for both `Server` and `ServerMap`: dropping every server collapses into a
// single change on the map, dropping one lands on the server itself.
export const serverRemoved: DiffRule = {
  id: 'server-removed',
  description: 'Removing a server leaves clients connected to a host that no longer serves them.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking(
      change.typeName === 'ServerMap' ? 'Every server was removed.' : 'The server was removed.'
    );
  },
};
