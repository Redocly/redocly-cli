import type { DiffRule } from '../types.js';

export const OperationRemoved: DiffRule = () => ({
  Operation(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Operation was removed.' });
  },
});

export const PathRemoved: DiffRule = () => ({
  PathItem(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Path was removed.' });
  },
});

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
