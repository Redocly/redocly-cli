import {
  addedItems,
  constraintDirection,
  effectiveTypes,
  isTypeSetNarrowed,
  isTypeSetWidened,
  missingItems,
  type ConstraintDirection,
} from '../../predicates.js';
import { breaking, type DiffRule, type Polarity, type Verdict } from '../../types.js';

/**
 * A tightening rejects input the API used to accept, so it breaks a request; a
 * loosening lets the API return something a consumer never handled, so it breaks
 * a response.
 */
function verdictFor(
  direction: ConstraintDirection,
  polarity: Polarity,
  message: string
): Verdict | undefined {
  if (direction === 'tighter' && polarity === 'request') return breaking(message);
  if (direction === 'looser' && polarity === 'response') return breaking(message);
  return undefined;
}

export const schemaTypeChanged: DiffRule = {
  id: 'schema-type-changed',
  description:
    'A narrower type rejects values that clients send. A wider type returns values that clients do not handle.',
  visit(change, ctx) {
    if (change.property !== 'type') return;
    // `nullable: true` is 3.0's spelling of `type: [..., 'null']`, so both sides are
    // read through the node itself rather than from the changed value alone.
    const before = effectiveTypes(change.base?.value, ctx.base(change.pointer)?.scalars.nullable);
    const after = effectiveTypes(
      change.revision?.value,
      ctx.revision(change.pointer)?.scalars.nullable
    );
    const described = `from '${[...before].join(' | ')}' to '${[...after].join(' | ')}'`;

    if (ctx.polarity === 'request' && isTypeSetNarrowed(before, after)) {
      return breaking(`Schema type narrowed ${described}.`);
    }
    if (ctx.polarity === 'response' && isTypeSetWidened(before, after)) {
      return breaking(`Schema type widened ${described}.`);
    }
    return undefined;
  },
};

export const enumValuesRemoved: DiffRule = {
  id: 'enum-values-removed',
  description: 'Removing enum values restricts what clients may send.',
  visit(change, ctx) {
    if (change.property !== 'enum' || ctx.polarity !== 'request') return;
    const removed = missingItems(change.base?.value, change.revision?.value);
    if (removed.length) {
      return breaking(`Enum values removed: ${removed.join(', ')}.`);
    }
    return undefined;
  },
};

export const enumValuesAdded: DiffRule = {
  id: 'enum-values-added',
  description: 'Adding enum values to response data may send clients values they never handled.',
  visit(change, ctx) {
    if (change.property !== 'enum' || ctx.polarity !== 'response') return;
    const added = addedItems(change.base?.value, change.revision?.value);
    if (added.length) {
      return breaking(`Enum values added: ${added.join(', ')}.`);
    }
    return undefined;
  },
};

export const requiredPropertiesAdded: DiffRule = {
  id: 'required-properties-added',
  description: 'Requiring new request properties breaks clients that do not send them.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'request') return;
    const added = addedItems(change.base?.value, change.revision?.value);
    if (added.length) {
      return breaking(`Properties became required: ${added.join(', ')}.`);
    }
    return undefined;
  },
};

export const requiredPropertiesRemoved: DiffRule = {
  id: 'required-properties-removed',
  description:
    'A response property that is no longer required can be absent, which breaks clients that read it.',
  visit(change, ctx) {
    if (change.property !== 'required' || ctx.polarity !== 'response') return;
    const removed = missingItems(change.base?.value, change.revision?.value);
    if (removed.length) {
      return breaking(`Properties are no longer required: ${removed.join(', ')}.`);
    }
    return undefined;
  },
};

export const propertyRemovedFromResponse: DiffRule = {
  id: 'property-removed-from-response',
  description: 'Removing a response property breaks clients that read it.',
  visit(change, ctx) {
    if (change.kind !== 'removed' || ctx.polarity !== 'response') return;
    // Only a member of a `properties` map counts; a subschema of `oneOf` does not.
    const parentPointer = ctx.nodeAt(change.pointer)?.parentPointer;
    if (!parentPointer || ctx.nodeAt(parentPointer)?.typeName !== 'SchemaProperties') return;
    return breaking('Schema property was removed.');
  },
};

function describeConstraint(property: string, before: unknown, after: unknown): string {
  if (before === undefined) return `\`${property}\` was added with value '${after}'.`;
  if (after === undefined) return `\`${property}\` was removed.`;
  return `\`${property}\` changed from '${before}' to '${after}'.`;
}

/**
 * A rule over one group of constraints on a value: the direction the constraint
 * moved in, together with the node's polarity, decides the verdict. The groups stay
 * separate rules so a report can name the constraint that actually moved.
 */
function constraintRule(rule: { id: string; description: string; properties: string[] }): DiffRule {
  const properties = new Set(rule.properties);
  return {
    id: rule.id,
    description: rule.description,
    visit(change, ctx) {
      if (!change.property || !properties.has(change.property)) return;
      const before = change.base?.value;
      const after = change.revision?.value;
      return verdictFor(
        constraintDirection(change.property, before, after),
        ctx.polarity,
        describeConstraint(change.property, before, after)
      );
    },
  };
}

export const numericRangeChanged = constraintRule({
  id: 'numeric-range-changed',
  description: 'Moving a numeric bound changes which values the API accepts or returns.',
  properties: ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf'],
});

export const stringLengthChanged = constraintRule({
  id: 'string-length-changed',
  description: 'Changing a string constraint changes which values the API accepts or returns.',
  properties: ['minLength', 'maxLength', 'pattern'],
});

export const schemaFormatChanged = constraintRule({
  id: 'schema-format-changed',
  description: 'A format constrains the accepted values beyond the type itself.',
  properties: ['format'],
});

export const additionalPropertiesChanged = constraintRule({
  id: 'additional-properties-changed',
  description: 'The `additionalProperties` value decides which extra properties an object accepts.',
  properties: ['additionalProperties'],
});

// `oneOf`/`anyOf` list alternatives, so dropping one accepts less; `allOf` combines
// constraints, so adding one accepts less. The key comes from the walker, which is
// why the combinator can be told apart without reading the pointer.
const ALTERNATIVE_COMBINATORS = new Set(['oneOf', 'anyOf']);

export const schemaCombinatorChanged: DiffRule = {
  id: 'schema-combinator-changed',
  description: 'Adding or dropping a subschema changes which shapes the API accepts.',
  visit(change, ctx) {
    if (change.kind === 'changed') return;

    const parentPointer = ctx.nodeAt(change.pointer)?.parentPointer;
    const parent = parentPointer ? ctx.nodeAt(parentPointer) : undefined;
    if (parent?.typeName !== 'SchemaList') return;

    const combinator = String(parent.keyInParent);
    if (combinator !== 'allOf' && !ALTERNATIVE_COMBINATORS.has(combinator)) return;

    const removed = change.kind === 'removed';
    const acceptsLess = combinator === 'allOf' ? !removed : removed;

    return verdictFor(
      acceptsLess ? 'tighter' : 'looser',
      ctx.polarity,
      `A \`${combinator}\` subschema was ${removed ? 'removed' : 'added'}.`
    );
  },
};

/**
 * Every rule over a `Schema` node, shared by the specification registries: an AsyncAPI
 * payload is the same node type, judged by the same questions.
 */
export const schemaRules: DiffRule[] = [
  schemaTypeChanged,
  enumValuesRemoved,
  enumValuesAdded,
  requiredPropertiesAdded,
  requiredPropertiesRemoved,
  propertyRemovedFromResponse,
  numericRangeChanged,
  stringLengthChanged,
  schemaFormatChanged,
  additionalPropertiesChanged,
  schemaCombinatorChanged,
];
