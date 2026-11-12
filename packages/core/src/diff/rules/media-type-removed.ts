import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

// A media type of a component nothing references travels neither way, so it breaks no client.
export const MediaTypeRemoved: DiffRule = () => ({
  MediaType(change, { report, getDirections }) {
    if (getDirections().length === 0) return;

    if (change.kind === 'removed') {
      report({ message: `Media type \`${nameOf(change.node)}\` was removed.` });
    }
    if (change.kind === 'modified' && change.property === 'key') {
      report({
        message: `Media type \`${change.base.value}\` became \`${change.revision.value}\`.`,
      });
    }
  },
  MediaTypesMap(change, { report, getDirections }) {
    if (change.kind === 'removed' && getDirections().length > 0) {
      report({ message: 'All media types were removed.' });
    }
  },
});
