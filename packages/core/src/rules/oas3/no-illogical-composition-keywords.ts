import { isRef } from '../../ref-utils.js';
import type {
  Oas3Discriminator,
  Oas3Schema,
  Oas3_1Schema,
  Referenced,
} from '../../typings/openapi.js';
import { dequal } from '../../utils/dequal.js';
import { getOwn } from '../../utils/get-own.js';
import { isDefined } from '../../utils/is-defined.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Oas3Rule } from '../../visitors.js';
import type { UserContext, ResolveFn } from '../../walk.js';

type CompositionSchema = Oas3Schema | Oas3_1Schema;
type CompositionKeyword = 'oneOf' | 'anyOf' | 'allOf';

type SourcedSchema = {
  schema: CompositionSchema;
  source: string | undefined;
};

type SchemaProperties = NonNullable<CompositionSchema['properties']>;

type PropertyComparison = {
  left: SourcedSchema;
  right: SourcedSchema;
  leftProperties: SchemaProperties;
  rightProperties: SchemaProperties;
  leftRequired: Set<string>;
  rightRequired: Set<string>;
  sharedNames: string[];
};

// Keywords these checks model, plus annotations that don't constrain which values match.
// A schema using anything else is left alone, because the unmodelled keyword may separate it.
const UNDERSTOOD_KEYWORDS: ReadonlySet<string> = new Set<keyof Oas3Schema | keyof Oas3_1Schema>([
  'type',
  'format',
  'enum',
  'const',
  'nullable',
  'properties',
  'required',
  'additionalProperties',
  'discriminator',
  '$ref',
  '$id',
  '$schema',
  '$anchor',
  '$comment',
  'title',
  'description',
  'default',
  'example',
  'examples',
  'deprecated',
  'readOnly',
  'writeOnly',
  'externalDocs',
  'xml',
]);

export const NoIllogicalCompositionKeywords: Oas3Rule = () => {
  return {
    AllOf(members, ctx) {
      const parentSchema = getParentSchema(ctx);
      if (!Array.isArray(members) || !parentSchema) return;

      // A lone member is redundant only when the wrapper carries nothing else of its own
      // and is not declaring a subtype of a discriminated schema.
      if (
        members.length === 0 ||
        (members.length === 1 &&
          Object.keys(parentSchema).length === 1 &&
          !isSubtypeOfDiscriminatedSchema(members[0], ctx.resolve))
      ) {
        reportSingleSchema(members, 'allOf', ctx);
      }

      reportEmptyMembers(members, 'allOf', ctx);
      reportDuplicateMembers(members, 'allOf', ctx);
    },

    AnyOf(members, ctx) {
      const parentSchema = getParentSchema(ctx);
      if (!Array.isArray(members) || !parentSchema) return;

      const hasDiscriminator = isPlainObject(parentSchema.discriminator);

      if (members.length < 2 && !hasDiscriminator) {
        reportSingleSchema(members, 'anyOf', ctx);
      }

      reportEmptyMembers(members, 'anyOf', ctx);
      reportDuplicateMembers(members, 'anyOf', ctx);

      if (hasDiscriminator) {
        reportInlineMembers(members, 'anyOf', ctx);
      }
    },

    OneOf(members, ctx) {
      const parentSchema = getParentSchema(ctx);
      if (!Array.isArray(members) || !parentSchema) return;

      const { discriminator } = parentSchema;
      const hasDiscriminator = isPlainObject(discriminator);

      if (members.length < 2 && !hasDiscriminator) {
        reportSingleSchema(members, 'oneOf', ctx);
      }

      reportEmptyMembers(members, 'oneOf', ctx);
      reportDuplicateMembers(members, 'oneOf', ctx);

      if (hasDiscriminator) {
        reportInlineMembers(members, 'oneOf', ctx);
      }

      reportAmbiguousMembers(members, hasDiscriminator ? discriminator : undefined, ctx);
    },
  };
};

// `struct` is not guaranteed to have rejected a malformed composition first.
function getParentSchema(ctx: UserContext): CompositionSchema | undefined {
  return isPlainObject(ctx.parent) ? ctx.parent : undefined;
}

function reportSingleSchema(
  members: CompositionSchema[],
  keyword: CompositionKeyword,
  ctx: UserContext
) {
  const suggestion = members.length === 1 ? ' Use the schema directly instead.' : '';
  ctx.report({
    message: `\`${keyword}\` should have at least two schemas.${suggestion}`,
    location: ctx.location.key(),
  });
}

// A schema whose `allOf` references a schema with a `discriminator` declares a subtype: the
// discriminator resolves the subtype by name, so the wrapper carries meaning of its own.
function isSubtypeOfDiscriminatedSchema(
  member: Referenced<CompositionSchema>,
  resolve: ResolveFn
): boolean {
  return isPlainObject(resolveSchema(member, resolve)?.schema.discriminator);
}

function reportEmptyMembers(
  members: CompositionSchema[],
  keyword: CompositionKeyword,
  ctx: UserContext
) {
  for (const [index, member] of members.entries()) {
    if (isPlainObject(member) && Object.keys(member).length === 0) {
      ctx.report({
        message: `Schema in \`${keyword}\` is empty, so it matches any value.`,
        location: ctx.location.child([index]),
      });
    }
  }
}

function reportInlineMembers(
  members: CompositionSchema[],
  keyword: CompositionKeyword,
  ctx: UserContext
) {
  for (const [index, member] of members.entries()) {
    if (isRef(member) || (isPlainObject(member) && '$id' in member)) continue;

    ctx.report({
      message: `Schema in \`${keyword}\` is inline, so the \`discriminator\` cannot select it. Use a \`$ref\` to a named schema.`,
      location: ctx.location.child([index]),
    });
  }
}

function reportDuplicateMembers(
  members: CompositionSchema[],
  keyword: CompositionKeyword,
  ctx: UserContext
) {
  for (let index = 1; index < members.length; index++) {
    const firstIndex = members.findIndex((other) => dequal(other, members[index]));
    if (firstIndex < index) {
      ctx.report({
        message: `Schema in \`${keyword}\` duplicates the schema at position ${firstIndex + 1}.`,
        location: ctx.location.child([index]),
      });
    }
  }
}

function reportAmbiguousMembers(
  members: CompositionSchema[],
  discriminator: Oas3Discriminator | undefined,
  ctx: UserContext
) {
  const { resolve, report, location } = ctx;
  const resolvedMembers = members.map((member) => resolveSchema(member, resolve));

  for (let leftIndex = 0; leftIndex < resolvedMembers.length - 1; leftIndex++) {
    const left = resolvedMembers[leftIndex];
    if (!left) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < resolvedMembers.length; rightIndex++) {
      const right = resolvedMembers[rightIndex];
      if (!right) continue;

      // Skip only pairs `reportDuplicateMembers` already reported, which compares raw nodes too.
      if (dequal(members[leftIndex], members[rightIndex])) continue;

      const reason = findOverlapReason(left, right, resolve, discriminator);
      if (!reason) continue;

      report({
        message: `Schemas in \`oneOf\` must be mutually exclusive. Found overlapping schemas: ${describeMember(
          members[leftIndex],
          leftIndex
        )} and ${describeMember(members[rightIndex], rightIndex)}. ${reason}`,
        location: location.key(),
      });
    }
  }
}

function describeMember(member: CompositionSchema, index: number): string {
  if (isRef(member)) return `\`${member.$ref}\``;
  if (member.title) return `\`${member.title}\``;
  return `schema at position ${index + 1}`;
}

function findOverlapReason(
  left: SourcedSchema,
  right: SourcedSchema,
  resolve: ResolveFn,
  discriminator?: Oas3Discriminator
): string | null {
  const leftSchema = left.schema;
  const rightSchema = right.schema;

  if (hasUnsupportedConstraint(leftSchema) || hasUnsupportedConstraint(rightSchema)) return null;

  if (areExclusive(leftSchema, rightSchema)) return null;

  if (schemaAllowsNull(leftSchema) && schemaAllowsNull(rightSchema)) {
    return 'Both schemas accept `null`.';
  }

  const leftValues = readAllowedValues(leftSchema);
  const rightValues = readAllowedValues(rightSchema);
  if (leftValues && rightValues) {
    const shared = leftValues.filter((value) => rightValues.some((other) => dequal(value, other)));
    return `Both schemas allow the values ${JSON.stringify(shared)}.`;
  }

  if (discriminator) {
    const { propertyName } = discriminator;
    // `struct` is not guaranteed to have rejected a non-string `propertyName` first.
    return typeof propertyName === 'string'
      ? describeDiscriminatorGap(leftSchema, rightSchema, propertyName)
      : null;
  }

  const propertyOverlap = findPropertyOverlap(left, right, resolve);
  if (propertyOverlap) return propertyOverlap;

  if (!leftSchema.properties && !rightSchema.properties) {
    const sharedTypes = getSharedTypes(leftSchema, rightSchema);
    if (sharedTypes) {
      return `Both schemas accept ${sharedTypes.map((type) => `\`${type}\``).join(', ')}.`;
    }
  }

  return null;
}

function describeDiscriminatorGap(
  left: CompositionSchema,
  right: CompositionSchema,
  propertyName: string
): string | null {
  const requiredInBoth =
    !!left.required?.includes(propertyName) && !!right.required?.includes(propertyName);
  if (requiredInBoth) return null;

  return `Add \`${propertyName}\` to \`required\` in every schema; the \`discriminator\` cannot read a property a value may omit.`;
}

function findPropertyOverlap(
  left: SourcedSchema,
  right: SourcedSchema,
  resolve: ResolveFn
): string | null {
  const comparison = collectPropertyComparison(left, right);
  if (!comparison) return null;

  if (forbidsPropertyRequiredBy(left.schema, comparison.leftProperties, comparison.rightRequired)) {
    return null;
  }
  if (
    forbidsPropertyRequiredBy(right.schema, comparison.rightProperties, comparison.leftRequired)
  ) {
    return null;
  }

  if (requiredSetsDistinguish(comparison)) return null;
  if (comparison.sharedNames.length === 0) return null;

  const shared = classifySharedProperties(comparison, resolve);
  if (!shared) return null;

  const { optionalDistinguishingNames, ambiguousNames } = shared;

  if (optionalDistinguishingNames.length > 0) {
    const alsoShared =
      ambiguousNames.length > 0 ? ` Other shared properties: ${quoteAll(ambiguousNames)}.` : '';
    return `Add ${quoteAll(
      optionalDistinguishingNames
    )} to \`required\` in every schema; an optional property cannot distinguish the schemas.${alsoShared}`;
  }

  if (ambiguousNames.length > 0) {
    return `Both schemas define ${quoteAll(
      ambiguousNames
    )} without constraints that exclude each other. Add a discriminator, or constrain the shared properties to different values.`;
  }

  return null;
}

function collectPropertyComparison(
  left: SourcedSchema,
  right: SourcedSchema
): PropertyComparison | null {
  const leftProperties = left.schema.properties;
  const rightProperties = right.schema.properties;
  if (!leftProperties || !rightProperties) return null;

  return {
    left,
    right,
    leftProperties,
    rightProperties,
    leftRequired: new Set(left.schema.required ?? []),
    rightRequired: new Set(right.schema.required ?? []),
    sharedNames: Object.keys(leftProperties).filter((name) => getOwn(rightProperties, name)),
  };
}

function requiredSetsDistinguish({
  leftProperties,
  rightProperties,
  leftRequired,
  rightRequired,
  sharedNames,
}: PropertyComparison): boolean {
  if (leftRequired.size === 0 || rightRequired.size === 0) return false;

  const sharedNameIsRequired = sharedNames.some(
    (name) => leftRequired.has(name) || rightRequired.has(name)
  );
  if (!hasIntersection(leftRequired, rightRequired) && !sharedNameIsRequired) return true;

  // A property required by both sides distinguishes nothing, no matter where it is declared.
  const leftRequiresUndeclared = [...leftRequired].some(
    (name) => !getOwn(rightProperties, name) && !rightRequired.has(name)
  );
  const rightRequiresUndeclared = [...rightRequired].some(
    (name) => !getOwn(leftProperties, name) && !leftRequired.has(name)
  );
  return leftRequiresUndeclared && rightRequiresUndeclared;
}

function classifySharedProperties(
  {
    left,
    right,
    leftProperties,
    rightProperties,
    leftRequired,
    rightRequired,
    sharedNames,
  }: PropertyComparison,
  resolve: ResolveFn
): { optionalDistinguishingNames: string[]; ambiguousNames: string[] } | null {
  const optionalDistinguishingNames: string[] = [];
  const ambiguousNames: string[] = [];

  for (const name of sharedNames) {
    const requiredInBoth = leftRequired.has(name) && rightRequired.has(name);

    const leftProperty = resolveSchema(getOwn(leftProperties, name), resolve, left.source);
    const rightProperty = resolveSchema(getOwn(rightProperties, name), resolve, right.source);
    if (!leftProperty || !rightProperty) continue;
    if (
      hasUnsupportedConstraint(leftProperty.schema) ||
      hasUnsupportedConstraint(rightProperty.schema)
    ) {
      continue;
    }

    if (areExclusive(leftProperty.schema, rightProperty.schema)) {
      if (requiredInBoth) return null;
      optionalDistinguishingNames.push(name);
      continue;
    }

    ambiguousNames.push(name);
  }

  return { optionalDistinguishingNames, ambiguousNames };
}

function forbidsPropertyRequiredBy(
  schema: CompositionSchema,
  declaredProperties: SchemaProperties,
  required: Set<string>
): boolean {
  if (schema.additionalProperties !== false) return false;
  return [...required].some((name) => !getOwn(declaredProperties, name));
}

function areExclusive(left: CompositionSchema, right: CompositionSchema): boolean {
  const leftValues = readAllowedValues(left);
  const rightValues = readAllowedValues(right);
  if (leftValues && rightValues) {
    return !leftValues.some((value) => rightValues.some((other) => dequal(value, other)));
  }

  const leftTypes = getTypeSet(left);
  const rightTypes = getTypeSet(right);
  // `format` is an annotation, not an assertion, so differing formats prove nothing.
  return !!leftTypes && !!rightTypes && !hasIntersection(leftTypes, rightTypes);
}

function resolveSchema(
  member: Referenced<CompositionSchema>,
  resolve: ResolveFn,
  from?: string
): SourcedSchema | undefined {
  if (isRef(member)) {
    const { node, location } = resolve(member, from);
    return isPlainObject(node) ? { schema: node, source: location?.source.absoluteRef } : undefined;
  }
  // JSON Schema allows `true` and `false` as schemas; these checks only read object schemas.
  return isPlainObject(member) ? { schema: member, source: from } : undefined;
}

function hasUnsupportedConstraint(schema: CompositionSchema): boolean {
  return Object.keys(schema).some(
    (keyword) => !UNDERSTOOD_KEYWORDS.has(keyword) && !keyword.startsWith('x-')
  );
}

function getTypeSet(schema: CompositionSchema): Set<string> | undefined {
  const declaredType = schema.type;
  if (declaredType === undefined) return undefined;

  const types = new Set(Array.isArray(declaredType) ? declaredType : [declaredType]);
  if ('nullable' in schema && schema.nullable === true) types.add('null');
  return types;
}

function getSharedTypes(left: CompositionSchema, right: CompositionSchema): string[] | undefined {
  if (hasUnsupportedConstraint(left) || hasUnsupportedConstraint(right)) return undefined;

  const leftTypes = getTypeSet(left);
  const rightTypes = getTypeSet(right);
  if (!leftTypes || !rightTypes) return undefined;

  const shared = [...leftTypes].filter((type) => rightTypes.has(type));
  return shared.length > 0 ? shared : undefined;
}

function schemaAllowsNull(schema: CompositionSchema): boolean {
  if ('nullable' in schema && schema.nullable === true) return true;
  const declaredType = schema.type;
  return Array.isArray(declaredType) ? declaredType.includes('null') : declaredType === 'null';
}

function readAllowedValues(schema: CompositionSchema): unknown[] | undefined {
  if (schema.enum) return schema.enum;
  const constValue = 'const' in schema ? schema.const : undefined;
  return isDefined(constValue) ? [constValue] : undefined;
}

function hasIntersection(left: Set<string>, right: Set<string>): boolean {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
}

function quoteAll(names: string[]): string {
  return names.map((name) => `\`${name}\``).join(', ');
}
