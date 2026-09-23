import type { DiffRule } from '../types.js';
import { itemsOnlyIn } from './utils.js';

export const RequiredPropertiesAdded: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!directions.includes('request')) return;
    const added = itemsOnlyIn(change.revision.value, change.base.value);
    if (added.length) report({ message: `Properties became required: ${added.join(', ')}.` });
  },
});
