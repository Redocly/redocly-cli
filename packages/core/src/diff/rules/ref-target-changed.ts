import { valueOf } from '../../node-tree/access.js';
import { dequal } from '../../utils/dequal.js';
import type { DiffRule } from '../types.js';

function describeTarget(value: unknown): string {
  return typeof value === 'string' ? `'${value}'` : 'an inline definition';
}

// Two targets are compared at their own places, not with each other, so a new target that
// describes other data cannot be told apart from a renamed one — unless both read the same.
export const RefTargetChanged: DiffRule = () => ({
  any(change, { report }) {
    if (change.kind !== 'modified' || change.property !== '$ref') return;
    const { base, revision } = change.node;
    if (base && revision && dequal(valueOf(base), valueOf(revision))) return;
    report({
      message: `Reference target changed from ${describeTarget(change.base.value)} to ${describeTarget(
        change.revision.value
      )}, which describes other data.`,
    });
  },
});
