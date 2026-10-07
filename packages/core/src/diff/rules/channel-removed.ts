import { nameOf } from '../diff-node.js';
import type { DiffRule } from '../types.js';
import { isRootField } from './utils.js';

export const ChannelRemoved: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind === 'removed') {
      report({ message: `Channel \`${nameOf(change.node)}\` was removed.` });
    }
  },
  NamedChannels(change, { report }) {
    if (change.kind === 'removed' && isRootField(change.node)) {
      report({ message: 'All channels were removed.' });
    }
  },
});
