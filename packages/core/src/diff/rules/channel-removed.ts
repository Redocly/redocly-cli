import type { DiffRule } from '../types.js';
import { nameOf } from './utils.js';

// A channel is where AsyncAPI messages travel, so both sides of it break together and the
// rule does not read the direction.
export const ChannelRemoved: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind === 'removed')
      report({ message: `Channel \`${nameOf(change.node)}\` was removed.` });
  },
  NamedChannels(change, { report }) {
    if (change.kind === 'removed') report({ message: 'All channels were removed.' });
  },
});
