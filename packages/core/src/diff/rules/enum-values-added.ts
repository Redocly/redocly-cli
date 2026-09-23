import type { DiffRule } from '../types.js';
import { itemsOnlyIn } from './utils.js';

export const EnumValuesAdded: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'enum') return;
    if (!directions.includes('response')) return;
    const added = itemsOnlyIn(change.revision.value, change.base.value);
    if (added.length) report({ message: `Enum values added: ${added.join(', ')}.` });
  },
});
