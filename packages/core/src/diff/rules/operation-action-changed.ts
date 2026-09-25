import type { DiffRule } from '../types.js';
import { describeChange, nameOf } from './utils.js';

// AsyncAPI only: an operation states its own direction, and swapping it turns every
// message of the channel around.
export const OperationActionChanged: DiffRule = () => ({
  Operation(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'action') return;
    report({
      message: describeChange(
        `Operation \`${nameOf(change.node)}\` action`,
        change.base.value,
        change.revision.value
      ),
    });
  },
});
