import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

export const MessageContentTypeChanged: DiffRule = () => ({
  Message(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'contentType') return;

    const subject = `\`contentType\` of message \`${nameOf(change.node)}\``;
    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (before === undefined) report({ message: `${subject} was set to '${after}'.` });
    else if (after === undefined) report({ message: `${subject} was removed.` });
    else report({ message: `${subject} changed from '${before}' to '${after}'.` });
  },
});
