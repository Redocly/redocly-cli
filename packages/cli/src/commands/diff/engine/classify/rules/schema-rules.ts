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
    'Narrowing a type restricts what clients may send; widening restricts what they can rely on receiving.',
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
  description: 'Un-requiring response properties breaks clients that rely on their presence.',
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

const NUMERIC_CONSTRAINTS = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
]);

export const numericRangeChanged: DiffRule = {
  id: 'numeric-range-changed',
  description: 'Moving a numeric bound changes which values the API accepts or returns.',
  visit(change, ctx) {
    if (!change.property || !NUMERIC_CONSTRAINTS.has(change.property)) return;
    const direction = constraintDirection(
      change.property,
      change.base?.value,
      change.revision?.value
    );
    return verdictFor(
      direction,
      ctx.polarity,
      `\`${change.property}\` changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};

const STRING_CONSTRAINTS = new Set(['minLength', 'maxLength', 'pattern']);

export const stringLengthChanged: DiffRule = {
  id: 'string-length-changed',
  description: 'Changing a string constraint changes which values the API accepts or returns.',
  visit(change, ctx) {
    if (!change.property || !STRING_CONSTRAINTS.has(change.property)) return;
    const direction = constraintDirection(
      change.property,
      change.base?.value,
      change.revision?.value
    );
    return verdictFor(
      direction,
      ctx.polarity,
      `\`${change.property}\` changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};

export const schemaFormatChanged: DiffRule = {
  id: 'schema-format-changed',
  description: 'A format constrains the accepted values beyond the type itself.',
  visit(change, ctx) {
    if (change.property !== 'format') return;
    const direction = constraintDirection('format', change.base?.value, change.revision?.value);
    return verdictFor(
      direction,
      ctx.polarity,
      change.base?.value === undefined
        ? `Format '${change.revision?.value}' was added.`
        : `Format changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};

export const additionalPropertiesChanged: DiffRule = {
  id: 'additional-properties-changed',
  description: 'Whether extra properties are allowed decides what an object may carry.',
  visit(change, ctx) {
    if (change.property !== 'additionalProperties') return;
    const direction = constraintDirection(
      'additionalProperties',
      change.base?.value,
      change.revision?.value
    );
    return verdictFor(
      direction,
      ctx.polarity,
      `\`additionalProperties\` changed from '${change.base?.value}' to '${change.revision?.value}'.`
    );
  },
};

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
    const isAlternative = ALTERNATIVE_COMBINATORS.has(combinator);
    if (!isAlternative && combinator !== 'allOf') return;

    const removed = change.kind === 'removed';
    const direction: ConstraintDirection = isAlternative
      ? removed
        ? 'tighter'
        : 'looser'
      : removed
        ? 'looser'
        : 'tighter';

    return verdictFor(
      direction,
      ctx.polarity,
      `A \`${combinator}\` subschema was ${removed ? 'removed' : 'added'}.`
    );
  },
};
