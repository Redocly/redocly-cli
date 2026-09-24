import { fieldOf } from '../../node-tree/access.js';
import { latestOf, typeOf } from '../diff-tree.js';
import type { DiffNode, DiffRule, Direction } from '../types.js';

/** What a node is called in its document: its key, or the key of the node a `$ref` item points at. */
export function nameOf(node: DiffNode): string {
  const entry = latestOf(node);
  return String(entry.target?.key ?? entry.key);
}

/** ` of `name`` for a property or a named component schema, and nothing for an inline one. */
export function ofSchema(node: DiffNode | null | undefined): string {
  const container = node?.parent && typeOf(node.parent);
  if (container !== 'SchemaProperties' && container !== 'NamedSchemas') return '';
  return ` of \`${nameOf(node!)}\``;
}

/** A parameter as a message names it, such as ``\`limit\` query parameter``. */
export function describeParameter(node: DiffNode): string {
  const location = fieldOf(latestOf(node), 'in');
  const name = fieldOf(latestOf(node), 'name');
  return [
    typeof name === 'string' ? `\`${name}\`` : undefined,
    typeof location === 'string' ? location : undefined,
    'parameter',
  ]
    .filter(Boolean)
    .join(' ');
}

/** The values of a list, each quoted, for a message. */
export function quoted(values: unknown[]): string {
  return values.map((value) => `'${value}'`).join(', ');
}

/** The names of a list, each in backticks, for a message. */
export function named(values: unknown[]): string {
  return values.map((value) => `\`${value}\``).join(', ');
}

/** The items of `list` that `other` does not have. */
export function itemsOnlyIn(list: unknown, other: unknown): unknown[] {
  if (!Array.isArray(list)) return [];
  const otherItems = Array.isArray(other) ? other : [];
  return list.filter((item) => !otherItems.includes(item));
}

/** Accepting less breaks the clients that send the data; accepting more, the ones that read it. */
export function breakingDirection(acceptsLess: boolean): Direction {
  return acceptsLess ? 'request' : 'response';
}

const LOWER_BOUNDS = new Set([
  'minimum',
  'exclusiveMinimum',
  'minLength',
  'minItems',
  'minProperties',
]);
const UPPER_BOUNDS = new Set([
  'maximum',
  'exclusiveMaximum',
  'maxLength',
  'maxItems',
  'maxProperties',
]);
// Equivalence of these cannot be decided by comparing values, so any change to one is taken
// as accepting less rather than guessed at.
const OPAQUE = new Set(['pattern', 'format', 'multipleOf']);

/** Whether a schema accepts less once `constraint` moved from `before` to `after`. */
export function acceptsLess(constraint: string, before: unknown, after: unknown): boolean {
  if (before === undefined) return true; // a new constraint
  if (after === undefined) return false; // one dropped
  // Only opening a closed object accepts more; swapping in a schema is narrower than an open one.
  if (constraint === 'additionalProperties') return !(before === false && after === true);
  if (OPAQUE.has(constraint)) return true;

  if (typeof before === 'number' && typeof after === 'number') {
    if (LOWER_BOUNDS.has(constraint)) return after > before;
    if (UPPER_BOUNDS.has(constraint)) return after < before;
  }
  // `exclusiveMinimum`/`exclusiveMaximum` are booleans in OpenAPI 3.0.
  if (typeof before === 'boolean' && typeof after === 'boolean') return after;

  return true;
}

/** How a value moved, for a message: set where it was absent, dropped, or changed. */
export function describeChange(subject: string, before: unknown, after: unknown): string {
  if (before === undefined) return `${subject} was added with value '${after}'.`;
  if (after === undefined) return `${subject} was removed.`;
  return `${subject} changed from '${before}' to '${after}'.`;
}

/**
 * A rule over one group of constraints on a value. The groups stay separate rules so a report
 * can name the constraint that actually moved.
 */
export function constraintRule(constraints: string[]): DiffRule {
  const watched = new Set(constraints);
  return () => ({
    Schema(change, { report, directions }) {
      if (change.kind !== 'modified' || !watched.has(change.property)) return;
      const before = change.base.value;
      const after = change.revision.value;
      if (directions.includes(breakingDirection(acceptsLess(change.property, before, after)))) {
        const subject = `\`${change.property}\`${ofSchema(change.node)}`;
        report({ message: describeChange(subject, before, after) });
      }
    },
  });
}
