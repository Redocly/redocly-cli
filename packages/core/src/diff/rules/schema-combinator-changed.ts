import { nameOf } from '../diff-node.js';
import type { DiffRule, DiffVisit } from '../types.js';
import { ofNamedSchema } from './utils.js';

// `oneOf`/`anyOf` list alternatives, so dropping one accepts less; `allOf` combines constraints,
// so adding one accepts less.
function combinatorChanged(combinator: 'allOf' | 'anyOf' | 'oneOf'): DiffVisit {
  return (change, { report, getDirections }) => {
    if (change.kind === 'modified') return;

    const removed = change.kind === 'removed';
    const acceptsLess = combinator === 'allOf' ? !removed : removed;
    if (!getDirections().includes(acceptsLess ? 'request' : 'response')) return;

    const owner = ofNamedSchema(change.node.parent?.parent);
    report({
      message: `\`${combinator}\` subschema${owner} was ${removed ? 'removed' : 'added'}.`,
    });
  };
}

// A whole list added constrains the schema, whichever keyword it is; removed, it frees it.
const listChanged: DiffVisit = (change, { report, getDirections }) => {
  if (change.kind === 'modified') return;

  const added = change.kind === 'added';
  if (!getDirections().includes(added ? 'request' : 'response')) return;

  const owner = ofNamedSchema(change.node.parent);
  report({ message: `\`${nameOf(change.node)}\`${owner} was ${added ? 'added' : 'removed'}.` });
};

export const SchemaCombinatorChanged: DiffRule = () => ({
  Schema: { AllOf: listChanged, AnyOf: listChanged, OneOf: listChanged },
  AllOf: { Schema: combinatorChanged('allOf') },
  AnyOf: { Schema: combinatorChanged('anyOf') },
  OneOf: { Schema: combinatorChanged('oneOf') },
});
