import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';

export const MessageRemoved: DiffRule = () => ({
  Message(change, { report }) {
    if (change.kind === 'removed') {
      report({ message: `Message \`${nameOf(change.node)}\` was removed.` });
    }
  },
  Channel: {
    NamedMessages(change, { report }) {
      if (change.kind === 'removed') {
        report({
          message: `All messages of channel \`${nameOf(change.node.parent!)}\` were removed.`,
        });
      }
    },
  },
});
