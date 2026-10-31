// The `types` stage: the Java type for a schema, and what a named schema renders as.

import {
  type ApiModel,
  type DateType,
  deref,
  discriminatorCases,
  enumValues,
  flattenAllOf,
  type SchemaModel,
  unwrapNullable,
} from '@redocly/client-generator';

import { typeName } from './naming.ts';

/**
 * What a named schema renders as: a record, a wire-backed enum, a sealed union interface
 * (every mapping target is a record, so the interface can seal over them), or nothing.
 */
export function classify(name: string, model: ApiModel): 'record' | 'enum' | 'union' | 'other' {
  const named = model.schemas.find((candidate) => candidate.name === name);
  if (named === undefined) return 'other';
  const schema = named.schema;
  const asEnum = enumValues(schema);
  if (asEnum !== undefined && (asEnum.scalar === 'string' || asEnum.scalar === 'integer')) {
    return 'enum';
  }
  if (
    (schema.kind === 'object' || schema.kind === 'intersection') &&
    flattenAllOf(schema, model) !== undefined
  ) {
    return 'record';
  }
  const cases = discriminatorCases(schema, model);
  if (
    cases !== undefined &&
    cases.cases.length > 0 &&
    cases.cases.every((entry) => classify(entry.schemaName, model) === 'record')
  ) {
    return 'union';
  }
  return 'other';
}

const SCALARS = { string: 'String', integer: 'Long', number: 'Double', boolean: 'Boolean' };

/** `date` or `date-time` — the two formats `dateType: Date` turns into java.time objects. */
export function isDateFormat(schema: SchemaModel): boolean {
  const format = schema.metadata?.format;
  return format === 'date' || format === 'date-time';
}

/**
 * The Java type for a schema. Every type is a reference type (`Long`, not `long`), so an
 * optional or nullable value is simply `null`; untyped shapes widen to `Object`.
 */
export function javaType(
  schema: SchemaModel,
  model: ApiModel,
  dateType: DateType = 'string'
): string {
  const bare = unwrapNullable(schema);
  switch (bare.kind) {
    case 'scalar':
      if (dateType === 'Date' && bare.scalar === 'string') {
        if (bare.metadata?.format === 'date-time') return 'OffsetDateTime';
        if (bare.metadata?.format === 'date') return 'LocalDate';
      }
      return SCALARS[bare.scalar];
    case 'array':
      return `List<${javaType(bare.items, model, dateType)}>`;
    case 'record':
      return `Map<String, ${javaType(bare.value, model, dateType)}>`;
    case 'ref': {
      const kind = classify(bare.name, model);
      if (kind !== 'other') return typeName(bare.name);
      const target = deref(bare, model);
      return target === undefined ? 'Object' : javaType(target, model, dateType);
    }
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get types.
      return SCALARS[bare.scalar];
    case 'literal':
      return typeof bare.value === 'string'
        ? 'String'
        : typeof bare.value === 'boolean'
          ? 'Boolean'
          : 'Double';
    case 'omit':
      // Java has no Omit; the base type is the honest annotation.
      return javaType({ kind: 'ref', name: bare.base }, model, dateType);
    case 'union':
    case 'null':
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'Object';
  }
}
