import type { DiffRule } from '../types.js';
import { itemsOnlyIn } from './utils.js';

export const EnumValuesRemoved: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'enum') return;
    if (!directions.includes('request')) return;
    const removed = itemsOnlyIn(change.base.value, change.revision.value);
    if (removed.length) report({ message: `Enum values removed: ${removed.join(', ')}.` });
  },
});
