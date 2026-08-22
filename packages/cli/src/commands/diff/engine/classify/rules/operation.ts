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

// AsyncAPI only: an operation states its own direction, and swapping it turns every
// message of the channel around.
export const operationActionChanged: DiffRule = {
  id: 'operation-action-changed',
  description: 'Swapping send and receive reverses which side of the channel the API is on.',
  visit(change) {
    if (change.property !== 'action') return;
    return breaking(
      `The operation action changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};
