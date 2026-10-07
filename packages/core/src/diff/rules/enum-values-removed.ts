import { itemsNotIn } from '../../utils/items-not-in.js';
import type { DiffRule } from '../types.js';
import { ofNamedSchema } from './utils.js';

export const EnumValuesRemoved: DiffRule = () => ({
  Schema(change, { report, getDirections }) {
    if (change.kind !== 'modified' || change.property !== 'enum') return;
    if (!getDirections().includes('request')) return;

    const removed = itemsNotIn(change.base.value, change.revision.value);
    if (!removed.length) return;

    const values = removed.map((value) => `'${value}'`).join(', ');
    report({ message: `Enum${ofNamedSchema(change.node)} lost values: ${values}.` });
  },
});
