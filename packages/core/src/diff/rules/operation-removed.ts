import type { DiffRule } from '../types.js';

export const OperationRemoved: DiffRule = () => ({
  Operation(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Operation was removed.' });
  },
});
