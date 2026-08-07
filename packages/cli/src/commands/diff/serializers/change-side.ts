import type { Change, ChangeSide } from '../engine/types.js';

// The side shown to the user: what was removed lives in the base document,
// everything else is best inspected in the revision.
export function displaySide(change: Change): ChangeSide | undefined {
  return change.kind === 'removed'
    ? (change.base ?? change.revision)
    : (change.revision ?? change.base);
}
