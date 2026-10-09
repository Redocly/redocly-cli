import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

// AsyncAPI only: an operation states its own direction, and swapping it turns every
// message of the channel around.
export const OperationActionChanged: DiffRule = () => ({
  Operation(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'action') return;

    const subject = `\`action\` of operation \`${nameOf(change.node)}\``;
    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
    else if (after === undefined) report({ message: `${subject} was removed.` });
    else report({ message: `${subject} changed from '${before}' to '${after}'.` });
  },
});
