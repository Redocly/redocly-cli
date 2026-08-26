// Ejected from @redocly/client-generator@0.4.0 — the built-in "php" generator.
// This file is yours: edit freely; the generated client stays machine-owned and is
// rebuilt by `redocly generate-client`. Newer generator versions merge in with
// `redocly eject-generator php --update`.
// The `models` stage: named schemas as promoted-constructor classes with
// fromArray/toArray hydration, native backed enums, and match-based union
// dispatchers — plus the wire↔typed value expressions the methods reuse.

import {
  type ApiModel,
  type DateType,
  deref,
  discriminatorCases,
  enumValues,
  flattenAllOf,
  type PropertyModel,
  type SchemaModel,
  uniqueIdentifiers,
  unwrapNullable,
} from '@redocly/client-generator';
import { PhpPrinter } from '@redocly/client-generator/printers/php';

import { className, PHP, phpString, propertyName } from './naming.ts';
import { classify, isDateFormat, phpNullable, phpType } from './types.ts';

/** True when the named schema renders as an `unmarshalX` union dispatcher. */
function isDiscriminatedUnion(name: string, model: ApiModel): boolean {
  const named = model.schemas.find((candidate) => candidate.name === name);
  return named !== undefined && discriminatorCases(named.schema, model) !== undefined;
}

/** Wire value → typed value expression, or undefined when the raw value is already right. */
export function hydration(
  schema: SchemaModel,
  expr: string,
  model: ApiModel,
  // Required on purpose: a defaulted `'string'` let a call site forget it, and the method
  // then returned a raw string where its own signature declared `\DateTimeImmutable`.
  dateType: DateType
): string | undefined {
  const bare = unwrapNullable(schema);
  if (dateType === 'Date' && bare.kind === 'scalar' && bare.scalar === 'string') {
    if (isDateFormat(bare)) return `new \\DateTimeImmutable(${expr})`;
  }
  if (bare.kind === 'omit')
    return hydration({ kind: 'ref', name: bare.base }, expr, model, dateType);
  if (bare.kind === 'ref') {
    const kind = classify(bare.name, model);
    if (kind === 'class') return `${className(bare.name)}::fromArray(${expr})`;
    if (kind === 'enum') return `${className(bare.name)}::from(${expr})`;
    if (isDiscriminatedUnion(bare.name, model)) return `unmarshal${className(bare.name)}(${expr})`;
    const target = deref(bare, model);
    return target === undefined ? undefined : hydration(target, expr, model, dateType);
  }
  if (bare.kind === 'array') {
    const item = hydration(bare.items, '$item', model, dateType);
    if (item === undefined) return undefined;
    return `array_map(static fn ($item) => ${item}, ${expr})`;
  }
  if (bare.kind === 'record') {
    const item = hydration(bare.value, '$item', model, dateType);
    if (item === undefined) return undefined;
    return `array_map(static fn ($item) => ${item}, ${expr})`;
  }
  return undefined;
}

/** Typed value → wire value expression, or undefined when it serializes as-is. */
export function serialization(
  schema: SchemaModel,
  expr: string,
  model: ApiModel,
  dateType: DateType = 'string'
): string | undefined {
  const bare = unwrapNullable(schema);
  if (dateType === 'Date' && bare.kind === 'scalar' && bare.scalar === 'string') {
    // A date-only value must not gain a time component on the way out.
    if (bare.metadata?.format === 'date') return `${expr}->format('Y-m-d')`;
    if (bare.metadata?.format === 'date-time') {
      return `${expr}->format(\\DateTimeInterface::ATOM)`;
    }
  }
  if (bare.kind === 'omit') {
    return serialization({ kind: 'ref', name: bare.base }, expr, model, dateType);
  }
  if (bare.kind === 'ref') {
    const kind = classify(bare.name, model);
    if (kind === 'class') return `${expr}->toArray()`;
    if (kind === 'enum') return `${expr}->value`;
    // A union value may be a hydrated member instance or a raw (default-case) array.
    if (isDiscriminatedUnion(bare.name, model)) {
      return `is_object(${expr}) ? ${expr}->toArray() : ${expr}`;
    }
    const target = deref(bare, model);
    return target === undefined ? undefined : serialization(target, expr, model, dateType);
  }
  if (bare.kind === 'array' || bare.kind === 'record') {
    const inner = bare.kind === 'array' ? bare.items : bare.value;
    const item = serialization(inner, '$item', model, dateType);
    if (item === undefined) return undefined;
    return `array_map(static fn ($item) => ${item}, ${expr})`;
  }
  return undefined;
}

function writeClass(
  printer: PhpPrinter,
  name: string,
  properties: PropertyModel[],
  model: ApiModel,
  dateType: DateType,
  description?: string
): void {
  // PHP requires defaulted parameters after required ones.
  const ordered = [
    ...properties.filter((property) => property.required),
    ...properties.filter((property) => !property.required),
  ];
  printer.doc(className(name), description);
  printer.line(`final class ${className(name)}`);
  printer.block(
    '{',
    () => {
      printer.block(
        'public function __construct(',
        () => {
          for (const property of ordered) {
            const type = phpType(property.schema, model, dateType);
            if (property.required) {
              printer.line(`public ${type} ${'$'}${propertyName(property.name)},`);
            } else {
              const nullable = phpNullable(type);
              printer.line(`public ${nullable} ${'$'}${propertyName(property.name)} = null,`);
            }
          }
        },
        ') {'
      );
      printer.line('}');
      printer.blank();

      printer.line('public static function fromArray(array $data): self');
      printer.block(
        '{',
        () => {
          printer.block(
            'return new self(',
            () => {
              for (const property of ordered) {
                const raw = `$data[${phpString(property.name)}]`;
                const typed = hydration(property.schema, raw, model, dateType);
                const php = propertyName(property.name);
                if (property.required) {
                  printer.line(`${php}: ${typed ?? raw},`);
                } else if (typed === undefined) {
                  printer.line(`${php}: ${raw} ?? null,`);
                } else {
                  printer.line(`${php}: isset(${raw}) ? ${typed} : null,`);
                }
              }
            },
            ');'
          );
        },
        '}'
      );
      printer.blank();

      printer.line('public function toArray(): array');
      printer.block(
        '{',
        () => {
          printer.line('$data = [];');
          for (const property of ordered) {
            const value = `$this->${propertyName(property.name)}`;
            const wire = serialization(property.schema, value, model, dateType) ?? value;
            if (property.required) {
              printer.line(`$data[${phpString(property.name)}] = ${wire};`);
            } else {
              printer.block(
                `if (${value} !== null) {`,
                () => {
                  printer.line(`$data[${phpString(property.name)}] = ${wire};`);
                },
                '}'
              );
            }
          }
          printer.line('return $data;');
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();
}

/** Render every named schema: classes (allOf flattened), native enums, union dispatchers. */
export function renderPhpModels(model: ApiModel, dateType: DateType = 'string'): string {
  const printer = new PhpPrinter();
  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined && (asEnum.scalar === 'string' || asEnum.scalar === 'integer')) {
      const backing = asEnum.scalar === 'string' ? 'string' : 'int';
      printer.doc(className(name), schema.description);
      printer.line(`enum ${className(name)}: ${backing}`);
      printer.block(
        '{',
        () => {
          // `1.5` and `15` fold to one pascal name; PHP rejects a duplicate case.
          const members = uniqueIdentifiers(
            asEnum.values.map((value) => String(value)),
            { style: 'pascal', reserved: PHP }
          );
          asEnum.values.forEach((value, index) => {
            const literal = typeof value === 'string' ? phpString(value) : String(value);
            printer.line(`case ${members[index]} = ${literal};`);
          });
        },
        '}'
      );
      printer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeClass(
          printer,
          name,
          flat.properties,
          model,
          dateType,
          flat.description ?? schema.description
        );
        continue;
      }
    }
    const cases = discriminatorCases(schema, model);
    if (cases !== undefined) {
      const typeName = className(name);
      const table = cases.cases
        .map((entry) => `${entry.value} -> ${className(entry.schemaName)}`)
        .join(', ');
      printer.line(
        `/** ${typeName} is a discriminated union (${phpString(cases.property)}): ${table}. */`
      );
      printer.line(`function unmarshal${typeName}(array $data): mixed`);
      printer.block(
        '{',
        () => {
          printer.block(
            `return match ($data[${phpString(cases.property)}] ?? null) {`,
            () => {
              for (const entry of cases.cases) {
                printer.line(
                  `${phpString(entry.value)} => ${className(entry.schemaName)}::fromArray($data),`
                );
              }
              printer.line('default => $data,');
            },
            '};'
          );
        },
        '}'
      );
      printer.blank();
      continue;
    }
    // Everything else (plain unions, aliases, records) has no PHP declaration;
    // references resolve to the underlying type via phpType.
  }
  return printer.toString();
}
