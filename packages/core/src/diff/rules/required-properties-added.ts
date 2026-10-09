import { itemsNotIn } from '../../utils/items-not-in.js';
import type { DiffRule } from '../types.js';
import { ofNamedSchema, propertiesMarkedAs } from './utils.js';

export const RequiredPropertiesAdded: DiffRule = () => ({
  Schema(change, { report, getDirections }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!getDirections().includes('request')) return;

    // A request does not send a `readOnly` property, so requiring it asks nothing of the client.
    const readOnly = propertiesMarkedAs(change.node, 'readOnly');
    const added = itemsNotIn(change.revision.value, change.base.value).filter(
      (name) => !readOnly.includes(String(name))
    );
    if (!added.length) return;

    const names = added.map((name) => `\`${name}\``).join(', ');
    report({ message: `Properties${ofNamedSchema(change.node)} became required: ${names}.` });
  },
});
