import type { DiffRule } from '../types.js';
import { itemsOnlyIn, named, ofSchema } from './utils.js';

export const RequiredPropertiesAdded: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!directions.includes('request')) return;
    const added = itemsOnlyIn(change.revision.value, change.base.value);
    if (added.length)
      report({ message: `Properties${ofSchema(change.node)} became required: ${named(added)}.` });
  },
});
