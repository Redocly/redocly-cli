import type { DiffRule, DiffVisit } from '../types.js';
import { breakingDirection } from './utils.js';

// `oneOf`/`anyOf` list alternatives, so dropping one accepts less; `allOf` combines
// constraints, so adding one accepts less. Only the OpenAPI type tree names each list after
// its keyword; the shared JSON Schema tree calls them all `SchemaList`, so there the rule
// could not tell the keywords apart and is not registered.
function combinatorChanged(combinator: 'allOf' | 'anyOf' | 'oneOf'): DiffVisit {
  return (change, { report, directions }) => {
    if (change.kind === 'modified') return;
    const removed = change.kind === 'removed';
    const acceptsLess = combinator === 'allOf' ? !removed : removed;
    if (directions.includes(breakingDirection(acceptsLess))) {
      report({ message: `A \`${combinator}\` subschema was ${removed ? 'removed' : 'added'}.` });
    }
  };
}

export const SchemaCombinatorChanged: DiffRule = () => ({
  AllOf: { Schema: combinatorChanged('allOf') },
  AnyOf: { Schema: combinatorChanged('anyOf') },
  OneOf: { Schema: combinatorChanged('oneOf') },
});
