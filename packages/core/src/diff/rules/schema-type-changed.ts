import { fieldOf } from '../../node-tree/access.js';
import type { DiffRule } from '../types.js';

// `integer` accepts a subset of what `number` does, so it is the one implicit widening among
// the JSON Schema primitive types.
const WIDER_TYPE: Partial<Record<string, string>> = { integer: 'number' };

/**
 * The types a schema accepts, folding OpenAPI 3.0's `nullable: true` into the 3.1 spelling
 * (`type: [..., 'null']`) so the two compare as equal.
 */
export function acceptedTypes(type: unknown, nullable?: unknown): string[] {
  const declared = Array.isArray(type) ? type : type === undefined ? [] : [type];
  const types = declared.filter((value): value is string => typeof value === 'string');
  return nullable === true && !types.includes('null') ? [...types, 'null'] : types;
}

/** The types of `types` that `accepted` does not take. */
export function typesNotIn(types: string[], accepted: string[]): string[] {
  return types.filter((type) => {
    const wider = WIDER_TYPE[type];
    return !accepted.includes(type) && (wider === undefined || !accepted.includes(wider));
  });
}

export const SchemaTypeChanged: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified' || change.property !== 'type') return;
    // `nullable: true` is 3.0's spelling of `type: [..., 'null']`, so both sides are
    // read through the node itself rather than from the changed value alone.
    const before = acceptedTypes(change.base.value, fieldOf(change.node.base, 'nullable'));
    const after = acceptedTypes(change.revision.value, fieldOf(change.node.revision, 'nullable'));
    // An absent `type` accepts anything, so there is nothing to narrow or widen.
    if (!before.length || !after.length) return;
    const described = `from '${before.join(' | ')}' to '${after.join(' | ')}'`;

    if (directions.includes('request') && typesNotIn(before, after).length) {
      report({ message: `Schema type narrowed ${described}.` });
    }
    if (directions.includes('response') && typesNotIn(after, before).length) {
      report({ message: `Schema type widened ${described}.` });
    }
  },
});
