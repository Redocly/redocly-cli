import type { DiffRule } from '../types.js';
import { itemsOnlyIn, named, ofSchema, propertiesMarked } from './utils.js';

export const RequiredPropertiesRemoved: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!directions.includes('response')) return;
    // A response does not send a `writeOnly` property, so no client reads it.
    const writeOnly = propertiesMarked(change.node, 'writeOnly');
    const removed = itemsOnlyIn(change.base.value, change.revision.value).filter(
      (name) => !writeOnly.includes(String(name))
    );
    if (removed.length) {
      report({
        message: `Properties${ofSchema(change.node)} are no longer required: ${named(removed)}.`,
      });
    }
  },
});
