import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

export const ResponseHeaderRemoved: DiffRule = () => ({
  Response: {
    Header(change, { report, getDirections }) {
      if (!getDirections().includes('response')) return;

      if (change.kind === 'removed') {
        report({ message: `Response header \`${nameOf(change.node)}\` was removed.` });
      }
      if (change.kind !== 'modified' || change.property !== 'key') return;

      // A header name is not case-sensitive.
      const { value: before } = change.base;
      const { value: after } = change.revision;
      if (String(before).toLowerCase() !== String(after).toLowerCase()) {
        report({ message: `Response header \`${before}\` was renamed to \`${after}\`.` });
      }
    },
    HeadersMap(change, { report, getDirections }) {
      if (change.kind === 'removed' && getDirections().includes('response')) {
        report({
          message: `All headers of response \`${nameOf(change.node.parent!)}\` were removed.`,
        });
      }
    },
  },
});
