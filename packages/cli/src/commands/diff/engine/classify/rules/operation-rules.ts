import { breaking, type DiffRule } from '../../types.js';

export const operationRemoved: DiffRule = {
  id: 'operation-removed',
  description: 'Removing an operation breaks all of its consumers.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Operation was removed.');
  },
};

export const pathRemoved: DiffRule = {
  id: 'path-removed',
  description: 'Removing a path breaks all consumers of its operations.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking('Path was removed.');
  },
};
