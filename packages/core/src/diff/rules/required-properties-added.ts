import type { DiffRule } from '../types.js';
import { itemsOnlyIn, named, ofSchema, propertiesMarked } from './utils.js';

export const RequiredPropertiesAdded: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!directions.includes('request')) return;
    // A request does not send a `readOnly` property, so requiring it asks nothing of the client.
    const readOnly = propertiesMarked(change.node, 'readOnly');
    const added = itemsOnlyIn(change.revision.value, change.base.value).filter(
      (name) => !readOnly.includes(String(name))
    );
    if (added.length)
      report({ message: `Properties${ofSchema(change.node)} became required: ${named(added)}.` });
  },
});
