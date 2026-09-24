import type { DiffRule } from '../types.js';
import { itemsOnlyIn, named, ofSchema } from './utils.js';

export const RequiredPropertiesRemoved: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!directions.includes('response')) return;
    const removed = itemsOnlyIn(change.base.value, change.revision.value);
    if (removed.length) {
      report({
        message: `Properties${ofSchema(change.node)} are no longer required: ${named(removed)}.`,
      });
    }
  },
});
