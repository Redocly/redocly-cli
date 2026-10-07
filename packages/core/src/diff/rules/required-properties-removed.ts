import { itemsNotIn } from '../../utils/items-not-in.js';
import type { DiffRule } from '../types.js';
import { ofNamedSchema, propertiesMarkedAs } from './utils.js';

export const RequiredPropertiesRemoved: DiffRule = () => ({
  Schema(change, { report, getDirections }) {
    if (change.kind !== 'modified' || change.property !== 'required') return;
    if (!getDirections().includes('response')) return;

    // A response does not send a `writeOnly` property, so no client reads it.
    const writeOnly = propertiesMarkedAs(change.node, 'writeOnly');
    const removed = itemsNotIn(change.base.value, change.revision.value).filter(
      (name) => !writeOnly.includes(String(name))
    );
    if (!removed.length) return;

    const names = removed.map((name) => `\`${name}\``).join(', ');
    report({
      message: `Properties${ofNamedSchema(change.node)} are no longer required: ${names}.`,
    });
  },
});
