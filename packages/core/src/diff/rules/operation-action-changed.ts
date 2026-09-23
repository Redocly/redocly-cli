import type { DiffRule } from '../types.js';

// AsyncAPI only: an operation states its own direction, and swapping it turns every
// message of the channel around.
export const OperationActionChanged: DiffRule = () => ({
  Operation(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'action') return;
    report({
      message: `The operation action changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});
