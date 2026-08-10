import { breaking, type DiffRule } from '../../types.js';

// A channel is where AsyncAPI messages travel, so both sides of it break together and
// these rules do not read the polarity.

// Registered for both `Channel` and `NamedChannels`: dropping every channel collapses
// into a single change on the map, dropping one lands on the channel itself.
export const channelRemoved: DiffRule = {
  id: 'channel-removed',
  description: 'Removing a channel leaves its publishers and subscribers with nowhere to go.',
  visit(change) {
    if (change.kind !== 'removed') return;
    return breaking(
      change.typeName === 'NamedChannels'
        ? 'Every channel was removed.'
        : 'The channel was removed.'
    );
  },
};

export const channelAddressChanged: DiffRule = {
  id: 'channel-address-changed',
  description: 'The address is what clients publish to and subscribe on.',
  visit(change) {
    if (change.property !== 'address') return;
    return breaking(
      `The channel address changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};
