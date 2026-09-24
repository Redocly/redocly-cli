import type { DiffRule } from '../types.js';

function describeTarget(value: unknown): string {
  return typeof value === 'string' ? `'${value}'` : 'an inline definition';
}

// Key-aligned comparison cannot verify whether two different targets are
// content-equivalent — the conservative verdict is breaking.
export const RefTargetChanged: DiffRule = () => ({
  any(change, { report }) {
    if (change.kind !== 'modified' || change.property !== '$ref') return;
    report({
      message: `The reference target changed from ${describeTarget(change.base.value)} to ${describeTarget(
        change.revision.value
      )}. The diff cannot check that the two targets are equivalent.`,
    });
  },
});
