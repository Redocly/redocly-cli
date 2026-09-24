import { fieldOf } from '../../node-tree/access.js';
import { dequal } from '../../utils/dequal.js';
import type { DiffRule } from '../types.js';
import { ofSchema } from './utils.js';

// `integer` accepts a subset of what `number` does, so it is the one implicit widening among
// the JSON Schema primitive types.
const WIDER_TYPE: Partial<Record<string, string>> = { integer: 'number' };

/**
 * The types a schema accepts, folding OpenAPI 3.0's `nullable: true` into the 3.1 spelling
 * (`type: [..., 'null']`) so the two compare as equal.
 */
function acceptedTypes(type: unknown, nullable?: unknown): string[] {
  const declared = Array.isArray(type) ? type : type === undefined ? [] : [type];
  const types = declared.filter((value): value is string => typeof value === 'string');
  return nullable === true && !types.includes('null') ? [...types, 'null'] : types;
}

/** The types of `types` that `accepted` does not take. */
function typesNotIn(types: string[], accepted: string[]): string[] {
  return types.filter((type) => {
    const wider = WIDER_TYPE[type];
    return !accepted.includes(type) && (wider === undefined || !accepted.includes(wider));
  });
}

export const SchemaTypeChanged: DiffRule = () => ({
  Schema(change, { report, directions }) {
    if (change.kind !== 'modified') return;
    const { base, revision } = change.node;
    // `nullable: true` is OpenAPI 3.0's spelling of `type: [..., 'null']`, so a change to either
    // is judged on what the node accepts as a whole, and once: by `type` when both changed.
    const typeChanged = !dequal(fieldOf(base, 'type'), fieldOf(revision, 'type'));
    if (change.property !== 'type' && (change.property !== 'nullable' || typeChanged)) return;

    const before = acceptedTypes(fieldOf(base, 'type'), fieldOf(base, 'nullable'));
    const after = acceptedTypes(fieldOf(revision, 'type'), fieldOf(revision, 'nullable'));
    // An absent `type` accepts anything, so there is nothing to narrow or widen.
    if (!before.length || !after.length) return;
    const described = `from '${before.join(' | ')}' to '${after.join(' | ')}'`;

    if (directions.includes('request') && typesNotIn(before, after).length) {
      report({ message: `Type${ofSchema(change.node)} narrowed ${described}.` });
    }
    if (directions.includes('response') && typesNotIn(after, before).length) {
      report({ message: `Type${ofSchema(change.node)} widened ${described}.` });
    }
  },
});
