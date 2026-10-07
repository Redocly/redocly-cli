import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

export const ChannelAddressChanged: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'address') return;

    const subject = `\`address\` of channel \`${nameOf(change.node)}\``;
    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
    else if (after === undefined) report({ message: `${subject} was removed.` });
    else report({ message: `${subject} changed from '${before}' to '${after}'.` });
  },
});
