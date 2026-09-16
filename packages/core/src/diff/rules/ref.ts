import { isRef } from '../../ref-utils.js';
import type { DiffRule } from '../types.js';

function describeTarget(value: unknown): string {
  if (isRef(value)) return `'${value.$ref}'`;
  return value === undefined ? 'an inline definition' : `'${value}'`;
}

// Key-aligned comparison cannot verify whether two different targets are
// content-equivalent — the conservative verdict is breaking.
export const RefTargetChanged: DiffRule = () => ({
  any(change, { report }) {
    if (change.kind !== 'modified') return;
    if (!isRef(change.base.value) && !isRef(change.revision.value)) return;
    report({
      message: `The reference target changed from ${describeTarget(change.base.value)} to ${describeTarget(
        change.revision.value
      )}. The diff cannot check that the two targets are equivalent.`,
    });
  },
});
