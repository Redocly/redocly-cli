// The `descriptor` stage: the wire-shape literals the embedded runtime routes by —
// pagination specs, envelope-header coerce specs, and Python data literals.

import {
  type ApiModel,
  headerCoerceType,
  identifierFor,
  type NeutralPaginationRule,
  type OperationModel,
} from '@redocly/client-generator';

import { naming, PY } from './naming.js';

/** JSON → Python literal (dicts/lists/strings/numbers/bools/None). */
export function pythonLiteral(value: unknown): string {
  return naming.literal(value);
}

/** The resolved pagination rule mapped to the snake_case spec dict the embedded
 * Python runtime consumes. */
export function paginationSpec(
  rule: NeutralPaginationRule | undefined
): Record<string, unknown> | undefined {
  if (rule === undefined) return undefined;
  return {
    style: rule.style,
    ...(rule.param !== undefined ? { param: rule.param } : {}),
    ...(rule.nextCursor !== undefined ? { next_cursor: rule.nextCursor } : {}),
    ...(rule.hasMore !== undefined ? { has_more: rule.hasMore } : {}),
    ...(rule.limitParam !== undefined ? { limit_param: rule.limitParam } : {}),
    ...(rule.items !== undefined ? { items: rule.items } : {}),
  };
}

/** Declared response headers as runtime coerce specs: `("wire-name", "snake_key", "type")`. */
export function envelopeHeaderSpecs(op: OperationModel, model: ApiModel): string {
  const used = new Set<string>();
  const specs = (op.successResponseHeaders ?? []).map((header) => {
    const base = identifierFor(header.name, { style: 'snake', reserved: PY });
    let key = base;
    let suffix = 2;
    while (used.has(key)) key = `${base}_${suffix++}`;
    used.add(key);
    const type = headerCoerceType(header.schema, model);
    return `(${naming.string(header.name)}, ${naming.string(key)}, ${naming.string(type)})`;
  });
  return `[${specs.join(', ')}]`;
}
