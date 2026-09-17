import {
  addedItems,
  constraintDirection,
  effectiveTypes,
  isTypeSetNarrowed,
  isTypeSetWidened,
  missingItems,
  type ConstraintDirection,
} from '../constraints.js';
import type { DiffRule, Direction } from '../types.js';

/**
 * A tightening rejects input the API used to accept, so it breaks a request; a
 * loosening lets the API return something a consumer never handled, so it breaks
 * a response.
 */
function breaks(moved: ConstraintDirection, direction: Direction): boolean {
  return (
    (moved === 'tighter' && direction === 'request') ||
    (moved === 'looser' && direction === 'response')
  );
}

export const SchemaTypeChanged: DiffRule = () => ({
  Schema(change, { report, direction, base, revision }) {
    if (change.kind !== 'modified' || change.property !== 'type') return;
    // `nullable: true` is 3.0's spelling of `type: [..., 'null']`, so both sides are
    // read through the node itself rather than from the changed value alone.
    const before = effectiveTypes(change.base.value, base(change.key)?.properties.nullable);
    const after = effectiveTypes(change.revision.value, revision(change.key)?.properties.nullable);
    const described = `from '${[...before].join(' | ')}' to '${[...after].join(' | ')}'`;

    if (direction === 'request' && isTypeSetNarrowed(before, after)) {
      report({ message: `Schema type narrowed ${described}.` });
    }
    if (direction === 'response' && isTypeSetWidened(before, after)) {
      report({ message: `Schema type widened ${described}.` });
    }
  },
});

export const EnumValuesRemoved: DiffRule = () => ({
  Schema(change, { report, direction }) {
    if (change.kind !== 'modified' || change.property !== 'enum' || direction !== 'request') return;
    const removed = missingItems(change.base.value, change.revision.value);
    if (removed.length) report({ message: `Enum values removed: ${removed.join(', ')}.` });
  },
});

export const EnumValuesAdded: DiffRule = () => ({
  Schema(change, { report, direction }) {
    if (change.kind !== 'modified' || change.property !== 'enum' || direction !== 'response')
      return;
    const added = addedItems(change.base.value, change.revision.value);
    if (added.length) report({ message: `Enum values added: ${added.join(', ')}.` });
  },
});

export const RequiredPropertiesAdded: DiffRule = () => ({
  Schema(change, { report, direction }) {
    if (change.kind !== 'modified' || change.property !== 'required' || direction !== 'request')
      return;
    const added = addedItems(change.base.value, change.revision.value);
    if (added.length) report({ message: `Properties became required: ${added.join(', ')}.` });
  },
});

export const RequiredPropertiesRemoved: DiffRule = () => ({
  Schema(change, { report, direction }) {
    if (change.kind !== 'modified' || change.property !== 'required' || direction !== 'response')
      return;
    const removed = missingItems(change.base.value, change.revision.value);
    if (removed.length)
      report({ message: `Properties are no longer required: ${removed.join(', ')}.` });
  },
});

export const PropertyRemovedFromResponse: DiffRule = () => ({
  Schema(change, { report, direction, nodeAt }) {
    if (change.kind !== 'removed' || direction !== 'response') return;
    // Only a member of a `properties` map counts; a subschema of `oneOf` does not.
    const parentKey = nodeAt(change.key)?.parentKey;
    if (!parentKey || nodeAt(parentKey)?.typeName !== 'SchemaProperties') return;
    report({ message: 'Schema property was removed.' });
  },
});

function describeConstraint(property: string, before: unknown, after: unknown): string {
  if (before === undefined) return `\`${property}\` was added with value '${after}'.`;
  if (after === undefined) return `\`${property}\` was removed.`;
  return `\`${property}\` changed from '${before}' to '${after}'.`;
}

/**
 * A rule over one group of constraints on a value: the direction the constraint
 * moved in, together with the node's direction, decides the verdict. The groups stay
 * separate rules so a report can name the constraint that actually moved.
 */
function constraintRule(properties: string[]): DiffRule {
  const watched = new Set(properties);
  return () => ({
    Schema(change, { report, direction }) {
      if (change.kind !== 'modified' || !watched.has(change.property)) return;
      const before = change.base.value;
      const after = change.revision.value;
      if (breaks(constraintDirection(change.property, before, after), direction)) {
        report({ message: describeConstraint(change.property, before, after) });
      }
    },
  });
}

export const NumericRangeChanged = constraintRule([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
]);
export const StringLengthChanged = constraintRule(['minLength', 'maxLength', 'pattern']);
export const SchemaFormatChanged = constraintRule(['format']);
export const AdditionalPropertiesChanged = constraintRule(['additionalProperties']);

// `oneOf`/`anyOf` list alternatives, so dropping one accepts less; `allOf` combines
// constraints, so adding one accepts less. The type tree names each list after its keyword,
// which is what tells a combinator apart from any other list of schemas.
const COMBINATOR_KEYWORDS: Record<string, string> = {
  AllOf: 'allOf',
  AnyOf: 'anyOf',
  OneOf: 'oneOf',
};

export const SchemaCombinatorChanged: DiffRule = () => ({
  Schema(change, { report, direction, nodeAt }) {
    if (change.kind === 'modified') return;

    const parentKey = nodeAt(change.key)?.parentKey;
    const parent = parentKey ? nodeAt(parentKey) : undefined;
    const combinator = parent && COMBINATOR_KEYWORDS[parent.typeName];
    if (!combinator) return;

    const removed = change.kind === 'removed';
    const acceptsLess = combinator === 'allOf' ? !removed : removed;
    if (breaks(acceptsLess ? 'tighter' : 'looser', direction)) {
      report({ message: `A \`${combinator}\` subschema was ${removed ? 'removed' : 'added'}.` });
    }
  },
});

/**
 * Every rule over a `Schema` node, shared by the specification registries: an AsyncAPI
 * payload is the same node type, judged by the same questions.
 */
export const schemaRules = {
  'schema-type-changed': SchemaTypeChanged,
  'enum-values-removed': EnumValuesRemoved,
  'enum-values-added': EnumValuesAdded,
  'required-properties-added': RequiredPropertiesAdded,
  'required-properties-removed': RequiredPropertiesRemoved,
  'property-removed-from-response': PropertyRemovedFromResponse,
  'numeric-range-changed': NumericRangeChanged,
  'string-length-changed': StringLengthChanged,
  'schema-format-changed': SchemaFormatChanged,
  'additional-properties-changed': AdditionalPropertiesChanged,
  'schema-combinator-changed': SchemaCombinatorChanged,
} satisfies Record<string, DiffRule>;
