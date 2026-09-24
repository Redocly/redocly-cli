import type { DiffRule } from '../types.js';
import { describeChange, nameOf } from './utils.js';

export const ChannelAddressChanged: DiffRule = () => ({
  Channel(change, { report }) {
    if (change.kind !== 'modified' || change.property !== 'address') return;
    report({
      message: describeChange(
        `Channel \`${nameOf(change.node)}\` address`,
        change.base.value,
        change.revision.value
      ),
    });
  },
});
