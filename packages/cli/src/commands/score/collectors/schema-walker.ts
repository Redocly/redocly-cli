import type { RefResolver, SchemaMetrics } from '../types.js';

const CONSTRAINT_KEYS = [
  'enum',
  'const',
  'format',
  'pattern',
  'minimum',
  'maximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'minProperties',
  'maxProperties',
  'multipleOf',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'uniqueItems',
] as const;

export function walkSchema(
  schema: Record<string, any> | undefined | null,
  resolveRef?: RefResolver,
  seen?: Set<object>
): SchemaMetrics {
  const result: SchemaMetrics = {
    depth: 0,
    propertyCount: 0,
    oneOfCount: 0,
    anyOfCount: 0,
    allOfCount: 0,
    hasDiscriminator: false,
    propertiesWithDescription: 0,
    totalProperties: 0,
    constraintCount: 0,
    writableTopLevelFieldCount: 0,
    propertiesWithExamples: 0,
  };

  if (!schema || typeof schema !== 'object') {
    return result;
  }

  if (schema.$ref && typeof schema.$ref === 'string' && resolveRef) {
    const resolved = resolveRef(schema.$ref);
    if (resolved) {
      return walkSchema(resolved, resolveRef, seen);
    }
    return result;
  }

  seen = seen ?? new Set();
  if (seen.has(schema)) {
    return result;
  }
  seen.add(schema);

  if (schema.discriminator && schema.discriminator.propertyName) {
    result.hasDiscriminator = true;
  }

  for (const key of CONSTRAINT_KEYS) {
    if (schema[key] !== undefined) {
      result.constraintCount++;
    }
  }

  if (schema.properties && typeof schema.properties === 'object') {
    const props = Object.entries(schema.properties) as [string, Record<string, any>][];
    result.totalProperties += props.length;
    result.propertyCount += props.length;

    for (const [, rawPropSchema] of props) {
      const propSchema =
        rawPropSchema?.$ref && resolveRef
          ? (resolveRef(rawPropSchema.$ref) ?? rawPropSchema)
          : rawPropSchema;
      if (propSchema && typeof propSchema === 'object') {
        if (propSchema.description) {
          result.propertiesWithDescription++;
        }
        if (propSchema.example !== undefined || propSchema.examples) {
          result.propertiesWithExamples++;
        }
        if (!propSchema.readOnly) {
          result.writableTopLevelFieldCount++;
        }
      }
    }

    let maxChildDepth = 0;
    for (const [, rawPropSchema] of props) {
      const propSchema =
        rawPropSchema?.$ref && resolveRef
          ? (resolveRef(rawPropSchema.$ref) ?? rawPropSchema)
          : rawPropSchema;
      if (propSchema && typeof propSchema === 'object') {
        const child = walkSchema(propSchema, resolveRef, seen);
        maxChildDepth = Math.max(maxChildDepth, child.depth);
        mergeChildMetrics(result, child);
      }
    }
    result.depth = Math.max(result.depth, 1 + maxChildDepth);
  }

  if (schema.items && typeof schema.items === 'object' && schema.items !== true) {
    const child = walkSchema(schema.items as Record<string, any>, resolveRef, seen);
    result.depth = Math.max(result.depth, 1 + child.depth);
    mergeChildMetrics(result, child);
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
    const child = walkSchema(schema.additionalProperties as Record<string, any>, resolveRef, seen);
    result.depth = Math.max(result.depth, 1 + child.depth);
    mergeChildMetrics(result, child);
  }

  walkComposition(schema, 'oneOf', result, resolveRef, seen);
  walkComposition(schema, 'anyOf', result, resolveRef, seen);
  walkComposition(schema, 'allOf', result, resolveRef, seen);

  return result;
}

function walkComposition(
  schema: Record<string, any>,
  keyword: 'oneOf' | 'anyOf' | 'allOf',
  result: SchemaMetrics,
  resolveRef: RefResolver | undefined,
  seen: Set<object>
): void {
  const arr = schema[keyword];
  if (!Array.isArray(arr) || arr.length === 0) return;

  const countKey = `${keyword}Count` as keyof Pick<
    SchemaMetrics,
    'oneOfCount' | 'anyOfCount' | 'allOfCount'
  >;
  result[countKey] += arr.length;

  let maxChildDepth = 0;
  for (const subSchema of arr) {
    if (subSchema && typeof subSchema === 'object') {
      const child = walkSchema(subSchema, resolveRef, seen);
      maxChildDepth = Math.max(maxChildDepth, child.depth);
      mergeChildMetrics(result, child);
    }
  }
  result.depth = Math.max(result.depth, 1 + maxChildDepth);
}

function mergeChildMetrics(parent: SchemaMetrics, child: SchemaMetrics): void {
  parent.oneOfCount += child.oneOfCount;
  parent.anyOfCount += child.anyOfCount;
  parent.allOfCount += child.allOfCount;
  parent.propertyCount += child.propertyCount;
  parent.propertiesWithDescription += child.propertiesWithDescription;
  parent.totalProperties += child.totalProperties;
  parent.constraintCount += child.constraintCount;
  parent.propertiesWithExamples += child.propertiesWithExamples;
  if (child.hasDiscriminator) {
    parent.hasDiscriminator = true;
  }
}
