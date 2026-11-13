// Ejected from @redocly/client-generator@0.10.1 — the built-in "php" generator.
// This file is yours: edit freely; the generated client stays machine-owned and is
// rebuilt by `redocly generate-client`. Newer generator versions merge in with
// `redocly eject-generator php --update`.
// The `types` stage: the PHP type declaration for a schema, its nullable and
// union forms, and the element type PHP's own syntax erases.

import {
  type ApiModel,
  type DateType,
  deref,
  discriminatorCases,
  enumValues,
  flattenAllOf,
  isNullable,
  type SchemaModel,
  unwrapNullable,
} from '@redocly/client-generator';

import { className } from './naming.ts';

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
      if (target === undefined) return 'mixed';
      if (target.kind !== 'union' || discriminatorCases(target, model) === undefined) {
        return phpType(target, model, dateType);
      }
      // A discriminated union hydrates through `unmarshalX`, so its members keep their own
      // types, and a value with an unknown discriminator stays the raw array.
      const members: SchemaModel[] = [
        ...target.members,
        { kind: 'array', items: { kind: 'unknown' } },
      ];
      const type = phpUnionType(members, (member) => phpType(member, model, dateType));
      return isNullable(target) ? phpNullable(type) : type;
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
      return phpUnionType(schema.members, (member) => decodedType(member, model));
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
 * The PHP type of a schema's decoded JSON, before any hydration: a class is an `array`, an
 * enum is its backing scalar, and a date is a `string`. Only a named discriminated union
 * hydrates, so a value of any other union keeps this type.
 */
function decodedType(schema: SchemaModel, model: ApiModel): string {
  if (isNullable(schema)) return phpNullable(decodedType(unwrapNullable(schema), model));
  if (schema.kind === 'omit') return 'array';
  if (schema.kind !== 'ref') return phpType(schema, model);
  if (classify(schema.name, model) === 'class') return 'array';
  const target = deref(schema, model);
  return target === undefined ? 'mixed' : decodedType(target, model);
}

/**
 * A union as a native PHP 8.1 union type (`int|string`, `string|array`). Rich list
 * filters are usually unions, and collapsing them to `mixed` throws away the typing that
 * makes the SDK worth generating. `mixed` cannot be a union member, so a member without a
 * PHP type of its own (inline object, intersection, unknown) forces the whole union to
 * `mixed`. Members that map to the same PHP type collapse to one.
 */
export function phpUnionType(
  members: SchemaModel[],
  memberType: (member: SchemaModel) => string
): string {
  const rendered: string[] = [];
  for (const member of members) {
    // `null` is handled by the caller's nullability check, never as a member here.
    if (member.kind === 'null') continue;
    const type = memberType(member);
    if (type === 'mixed') return 'mixed';
    // A nullable member contributes its bare type plus null, and a union member each of its
    // types, because PHP rejects a union that names a type twice.
    const parts = type.startsWith('?') ? [type.slice(1), 'null'] : type.split('|');
    for (const part of parts) {
      if (!rendered.includes(part)) rendered.push(part);
    }
  }
  const bare = rendered.filter((part) => part !== 'null');
  if (bare.length === 0) return 'mixed';
  // `null` goes last, so a caller's `phpNullable` sees it and does not add it twice.
  return rendered.includes('null') ? phpNullable(bare.join('|')) : bare.join('|');
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
