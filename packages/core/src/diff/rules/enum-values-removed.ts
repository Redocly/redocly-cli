import { itemsNotIn } from '../../utils/items-not-in.js';
import type { DiffRule } from '../types.js';
import { ofNamedSchema } from './utils.js';

export const EnumValuesRemoved: DiffRule = () => ({
  Schema(change, { report, getDirections }) {
    if (change.kind !== 'modified' || change.property !== 'enum') return;
    if (!getDirections().includes('request')) return;

    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (after === undefined) return;

    if (before === undefined) {
      const listed = Array.isArray(after) ? after : [];
      const values = listed.map((value) => `'${value}'`).join(', ');

      report({ message: `Enum${ofNamedSchema(change.node)} was set to ${values}.` });
      return;
    }

    const removed = itemsNotIn(before, after);
    if (!removed.length) return;

    const values = removed.map((value) => `'${value}'`).join(', ');
    report({ message: `Enum${ofNamedSchema(change.node)} lost values: ${values}.` });
  },
});
