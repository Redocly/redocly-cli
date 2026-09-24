import { fieldOf } from '../../node-tree/access.js';
import { latestOf, typeOf } from '../diff-tree.js';
import type { DiffNode, DiffRule } from '../types.js';
import { nameOf } from './utils.js';

// An OpenAPI server sits in a list and is known by its URL; an AsyncAPI one by its key.
function describeServer(server: DiffNode): string {
  const url = fieldOf(latestOf(server), 'url');
  return typeof url === 'string' ? url : nameOf(server);
}

// Dropping every server collapses into a single change on the map or list, dropping one lands
// on the server itself. An OpenAPI path or operation that loses its own `servers` falls back to
// the document's, so only the document's list counts.
export const ServerRemoved: DiffRule = () => ({
  Server(change, { report }) {
    if (change.kind === 'removed') {
      report({ message: `Server \`${describeServer(change.node)}\` was removed.` });
    }
  },
  ServerMap(change, { report }) {
    if (change.kind === 'removed') report({ message: 'All servers were removed.' });
  },
  ServerList(change, { report }) {
    const isDocumentList = change.node.parent && typeOf(change.node.parent) === 'Root';
    if (change.kind === 'removed' && isDocumentList) {
      report({ message: 'All servers were removed.' });
    }
  },
});
