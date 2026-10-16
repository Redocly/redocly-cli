import { itemsNotIn } from '../../utils/items-not-in.js';
import type { DiffRule } from '../types.js';
import { ofNamedSchema } from './utils.js';

export const EnumValuesAdded: DiffRule = () => ({
  Schema(change, { report, getDirections }) {
    if (change.kind !== 'modified' || change.property !== 'enum') return;
    if (!getDirections().includes('response')) return;

    const { value: before } = change.base;
    const { value: after } = change.revision;

    if (before === undefined) return;

    if (after === undefined) {
      report({ message: `Enum${ofNamedSchema(change.node)} was removed.` });
      return;
    }

    const added = itemsNotIn(after, before);
    if (!added.length) return;

    const values = added.map((value) => `'${value}'`).join(', ');
    report({ message: `Enum${ofNamedSchema(change.node)} gained values: ${values}.` });
  },
});
