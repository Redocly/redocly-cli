import type { DiffRule } from '../types.js';

// A channel is where AsyncAPI messages travel, so both sides of it break together and
// these rules do not read the direction.
export const ChannelRemoved: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind === 'removed') report({ message: 'The channel was removed.' });
  },
  NamedChannels(change, { report }) {
    if (change.kind === 'removed') report({ message: 'Every channel was removed.' });
  },
});

export const ChannelAddressChanged: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'address') return;
    report({
      message: `The channel address changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});
