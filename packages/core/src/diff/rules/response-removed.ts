import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

// A component response is returned by no operation until one references it.
export const ResponseRemoved: DiffRule = () => ({
  Responses: {
    Response(change, { report }) {
      if (change.kind === 'removed') {
        report({ message: `Response \`${nameOf(change.node)}\` was removed.` });
      }
      if (change.kind === 'modified' && change.property === 'key') {
        report({
          message: `Response \`${change.base.value}\` became \`${change.revision.value}\`.`,
        });
      }
    },
  },
});
