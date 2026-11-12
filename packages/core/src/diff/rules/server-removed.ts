import { fieldOf } from '../../node-tree/access.js';
import { latestOf, nameOf } from '../diff-node.js';
import type { DiffRule, DiffVisit } from '../types.js';
import { isRootField } from './utils.js';

const ADDRESS = new Set(['host', 'pathname', 'protocol']);

// An OpenAPI path or operation that loses its own `servers` falls back to the document's, so only
// the document's list counts.
const allServersRemoved: DiffVisit = (change, { report }) => {
  if (change.kind === 'removed' && isRootField(change.node)) {
    report({ message: 'All servers were removed.' });
  }
};

export const ServerRemoved: DiffRule = () => ({
  Server(change, { report }) {
    if (change.kind === 'removed') {
      const url = fieldOf(latestOf(change.node), 'url');
      const name = typeof url === 'string' ? url : nameOf(change.node);
      report({ message: `Server \`${name}\` was removed.` });
    }
    if (change.kind !== 'modified') return;

    // An OpenAPI server is known by its URL; an AsyncAPI one by its key, and it moves with its
    // `host`, `pathname`, or `protocol`.
    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (change.property === 'url') {
      report({ message: `Server \`${before}\` became \`${after}\`.` });
    }
    if (ADDRESS.has(change.property)) {
      const subject = `\`${change.property}\` of server \`${nameOf(change.node)}\``;

      if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
      else if (after === undefined) report({ message: `${subject} was removed.` });
      else report({ message: `${subject} changed from '${before}' to '${after}'.` });
    }
  },
  ServerMap: allServersRemoved,
  ServerList: allServersRemoved,
});
