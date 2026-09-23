import type { DiffRule } from '../types.js';

// A channel is where AsyncAPI messages travel, so both sides of it break together and the
// rule does not read the direction.
export const ChannelRemoved: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind === 'removed') report({ message: 'The channel was removed.' });
  },
  NamedChannels(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Every channel was removed.' });
  },
});
