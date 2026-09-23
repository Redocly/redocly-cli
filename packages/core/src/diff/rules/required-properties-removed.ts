import type { DiffRule } from '../types.js';
import { itemsOnlyIn } from './utils.js';

export const RequiredPropertiesRemoved: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!directions.includes('response')) return;
    const removed = itemsOnlyIn(change.base.value, change.revision.value);
    if (removed.length) {
      report({ message: `Properties are no longer required: ${removed.join(', ')}.` });
    }
  },
});
