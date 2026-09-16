import { isRef } from '../../ref-utils.js';
import { breaking, type DiffRule } from '../types.js';

function describeTarget(value: unknown): string {
  if (isRef(value)) return `'${value.$ref}'`;
  return value === undefined ? 'an inline definition' : `'${value}'`;
}

// Key-aligned comparison cannot verify whether two different targets are
// content-equivalent — the conservative verdict is breaking.
export const refTargetChanged: DiffRule = {
  id: 'ref-target-changed',
  description:
    'The `$ref` points to a different target. The diff cannot check that the new target is equivalent.',
  visit(change) {
    if (change.kind !== 'modified') return;
    if (!isRef(change.base.value) && !isRef(change.revision.value)) return;
    return breaking(
      `The reference target changed from ${describeTarget(change.base.value)} to ${describeTarget(
        change.revision.value
      )}. The diff cannot check that the two targets are equivalent.`
    );
  },
};
