import type { DiffRule } from '../types.js';

export const ChannelAddressChanged: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'address') return;
    report({
      message: `The channel address changed from '${change.base.value}' to '${change.revision.value}'.`,
    });
  },
});
