// The `types` stage: the PHP type declaration for a schema, its nullable and
// union forms, and the element type PHP's own syntax erases.

import {
  deref,
  enumValues,
  flattenAllOf,
  isNullable,
  unwrapNullable,
  type DateType,
} from '../../authoring/index.js';
import type { ApiModel, SchemaModel } from '../../intermediate-representation/model.js';
import { className } from './naming.js';

/** What a named schema renders as: a class, a native enum, or nothing (alias). */
export function classify(name: string, model: ApiModel): 'class' | 'enum' | 'other' {
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
    return 'class';
  }
  return 'other';
}

/** The PHP type declaration for a schema (arrays and unions widen to array/mixed). */
export function phpType(
  schema: SchemaModel,
  model: ApiModel,
  dateType: DateType = 'string'
): string {
  if (isNullable(schema)) {
    const inner = phpType(unwrapNullable(schema), model, dateType);
    return phpNullable(inner);
  }
  switch (schema.kind) {
    case 'scalar':
      // Under `dateType: Date`, date and date-time become DateTimeImmutable — PHP's
      // immutable date object parses and formats both wire shapes.
      if (dateType === 'Date' && schema.scalar === 'string' && isDateFormat(schema)) {
        return '\\DateTimeImmutable';
      }
      return { string: 'string', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'array':
    case 'record':
      return 'array';
    case 'ref': {
      const kind = classify(schema.name, model);
      if (kind === 'class' || kind === 'enum') return className(schema.name);
      const target = deref(schema, model);
      return target === undefined ? 'mixed' : phpType(target, model, dateType);
    }
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get types.
      return { string: 'string', integer: 'int', number: 'float', boolean: 'bool' }[schema.scalar];
    case 'literal':
      return typeof schema.value === 'string'
        ? 'string'
        : typeof schema.value === 'boolean'
          ? 'bool'
          : 'float';
    case 'omit':
      // PHP has no Omit; the base class is the honest annotation.
      return className(schema.base);
    case 'union':
      return phpUnionType(schema.members, model, dateType);
    case 'null':
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'mixed';
  }
}

/** `date` or `date-time` — the two formats `dateType: Date` turns into objects. */
export function isDateFormat(schema: SchemaModel): boolean {
  const format = schema.metadata?.format;
  return format === 'date' || format === 'date-time';
}

/**
 * The nullable form of a PHP type. `?T` for a single type, `A|B|null` for a union — PHP
 * forbids mixing `?` with `|`, and `mixed` already includes null.
 */
export function phpNullable(type: string): string {
  if (type === 'mixed' || type.startsWith('?') || type.endsWith('|null')) return type;
  return type.includes('|') ? `${type}|null` : `?${type}`;
}

/**
 * A union as a native PHP 8.1 union type (`int|string`, `PromotionType|array`). Rich list
 * filters are usually unions, and collapsing them to `mixed` throws away the typing that
 * makes the SDK worth generating. `mixed` cannot be a union member, so a member without a
 * PHP type of its own (inline object, intersection, unknown) forces the whole union to
 * `mixed`. Members that map to the same PHP type collapse to one.
 */
export function phpUnionType(members: SchemaModel[], model: ApiModel, dateType: DateType): string {
  const rendered: string[] = [];
  for (const member of members) {
    // `null` is handled by the caller's nullability check, never as a member here.
    if (member.kind === 'null') continue;
    const type = phpType(member, model, dateType);
    if (type === 'mixed') return 'mixed';
    // A nullable member inside a union contributes its bare type plus null.
    const bare = type.startsWith('?') ? type.slice(1) : type;
    if (!rendered.includes(bare)) rendered.push(bare);
    if (type.startsWith('?') && !rendered.includes('null')) rendered.push('null');
  }
  if (rendered.length === 0) return 'mixed';
  return rendered.join('|');
}

/**
 * The element type behind a PHP type that erases it. `array` and `\Generator` are as
 * specific as PHP's syntax gets, so the docblock carries what they hold — that is what
 * static analysis and readers actually go by.
 */
export function phpElementType(
  schema: SchemaModel | undefined,
  model: ApiModel,
  dateType: DateType
): string | undefined {
  if (schema === undefined) return undefined;
  const bare = unwrapNullable(schema);
  if (bare.kind === 'ref') {
    const target = deref(bare, model);
    // A named schema that IS an array (a collection alias) keeps its element type.
    return classify(bare.name, model) === 'other'
      ? phpElementType(target, model, dateType)
      : undefined;
  }
  if (bare.kind !== 'array') return undefined;
  const element = phpType(bare.items, model, dateType);
  return element === 'mixed' ? undefined : element;
}
