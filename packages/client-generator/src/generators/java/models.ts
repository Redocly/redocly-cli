// The `models` stage: named schemas as records with fromJson/toJson hydration,
// wire-backed enums, and sealed union interfaces with a parse dispatcher — plus the
// wire→typed value expressions the methods reuse.

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
import { JavaPrinter } from '@redocly/client-generator/printers/java';

import { JAVA, javaString, typeName } from './naming.ts';
import { classify, isDateFormat, javaType } from './types.ts';

/**
 * Wire value → typed value expression over the runtime's JSON graph, or undefined when
 * the raw `Object` is already the type. `depth` names the lambda parameters of nested
 * collections (`item`, `item2`, …): Java rejects a lambda parameter that shadows one.
 */
export function hydration(
  schema: SchemaModel,
  expr: string,
  model: ApiModel,
  // Required on purpose: a defaulted `'string'` let a call site forget it, and the method
  // then returned a raw string where its own signature declared `OffsetDateTime`.
  dateType: DateType,
  depth = 0
): string | undefined {
  const bare = unwrapNullable(schema);
  switch (bare.kind) {
    case 'scalar':
      if (dateType === 'Date' && bare.scalar === 'string' && isDateFormat(bare)) {
        return bare.metadata?.format === 'date'
          ? `asLocalDate(${expr})`
          : `asOffsetDateTime(${expr})`;
      }
      return `${SCALAR_READERS[bare.scalar]}(${expr})`;
    case 'enum':
      return `${SCALAR_READERS[bare.scalar]}(${expr})`;
    case 'literal':
      return `${SCALAR_READERS[typeof bare.value === 'string' ? 'string' : typeof bare.value === 'boolean' ? 'boolean' : 'number']}(${expr})`;
    case 'omit':
      return hydration({ kind: 'ref', name: bare.base }, expr, model, dateType, depth);
    case 'ref': {
      const kind = classify(bare.name, model);
      if (kind === 'record') return `${typeName(bare.name)}.fromJson(${expr})`;
      if (kind === 'enum') {
        const reader = enumValues(deref(bare, model)!)!.scalar === 'string' ? 'asString' : 'asLong';
        return `${typeName(bare.name)}.fromWire(${reader}(${expr}))`;
      }
      if (kind === 'union') return `parse${typeName(bare.name)}(${expr})`;
      const target = deref(bare, model);
      return target === undefined ? undefined : hydration(target, expr, model, dateType, depth);
    }
    case 'array':
    case 'record': {
      const item = depth === 0 ? 'item' : `item${depth + 1}`;
      const inner =
        hydration(
          bare.kind === 'array' ? bare.items : bare.value,
          item,
          model,
          dateType,
          depth + 1
        ) ?? item;
      return `${bare.kind === 'array' ? 'asList' : 'asMap'}(${expr}, ${item} -> ${inner})`;
    }
    case 'union':
    case 'null':
    case 'object':
    case 'intersection':
    case 'unknown':
      return undefined;
  }
}

const SCALAR_READERS = {
  string: 'asString',
  integer: 'asLong',
  number: 'asDouble',
  boolean: 'asBoolean',
};

/** The record components may not collide with the record's own methods or the locals of fromJson/toJson. */
// prettier-ignore
const RECORD_MEMBER_SLOTS = [
  'data', 'json', 'toJson', 'fromJson', 'hashCode', 'equals', 'toString', 'getClass', 'wait',
  'notify', 'notifyAll', 'clone', 'finalize',
];

/** The sealed unions a record is a member of, so it declares `implements` for each. */
function unionsOf(name: string, model: ApiModel): string[] {
  const unions: string[] = [];
  for (const candidate of model.schemas) {
    if (classify(candidate.name, model) !== 'union') continue;
    const cases = discriminatorCases(candidate.schema, model)!;
    if (cases.cases.some((entry) => entry.schemaName === name)) {
      unions.push(typeName(candidate.name));
    }
  }
  return unions;
}

function writeRecord(
  printer: JavaPrinter,
  name: string,
  properties: PropertyModel[],
  model: ApiModel,
  dateType: DateType,
  description?: string
): void {
  // A response never carries a `writeOnly` property, and responses decode into this same
  // record, so the property is optional even when the description requires it.
  const fields = properties.map((property) =>
    property.writeOnly ? { ...property, required: false } : property
  );
  const components = uniqueIdentifiers(
    fields.map((property) => property.name),
    { style: 'camel', reserved: JAVA, taken: RECORD_MEMBER_SLOTS }
  );
  const record = typeName(name);
  const interfaces = ['JsonValue', ...unionsOf(name, model)];
  printer.doc(record, description);
  printer.block(
    `public record ${record}(`,
    () => {
      fields.forEach((property, index) => {
        const comma = index < fields.length - 1 ? ',' : '';
        printer.line(`${javaType(property.schema, model, dateType)} ${components[index]}${comma}`);
      });
    },
    `) implements ${interfaces.join(', ')} {`
  );
  printer.indent(() => {
    printer.block(
      `public static ${record} fromJson(Object json) {`,
      () => {
        printer.line('Map<String, Object> data = asObject(json);');
        printer.block(
          'if (data == null) {',
          () => {
            printer.line('return null;');
          },
          '}'
        );
        printer.block(
          `return new ${record}(`,
          () => {
            fields.forEach((property, index) => {
              const raw = `data.get(${javaString(property.name)})`;
              const comma = index < fields.length - 1 ? ',' : '';
              printer.line(`${hydration(property.schema, raw, model, dateType) ?? raw}${comma}`);
            });
          },
          ');'
        );
      },
      '}'
    );
    printer.blank();
    printer.line('@Override');
    printer.block(
      'public Map<String, Object> toJson() {',
      () => {
        printer.line('Map<String, Object> data = new LinkedHashMap<>();');
        fields.forEach((property, index) => {
          const put = `data.put(${javaString(property.name)}, ${components[index]});`;
          if (property.required) {
            printer.line(put);
          } else {
            printer.block(
              `if (${components[index]} != null) {`,
              () => {
                printer.line(put);
              },
              '}'
            );
          }
        });
        printer.line('return data;');
      },
      '}'
    );
  });
  printer.line('}');
  printer.blank();
}

function writeEnum(
  printer: JavaPrinter,
  name: string,
  values: Array<string | number | boolean>,
  scalar: 'string' | 'integer',
  description?: string
): void {
  const enumName = typeName(name);
  const wireType = scalar === 'string' ? 'String' : 'Long';
  const members = enumValues({ kind: 'enum', values, scalar })!.memberNames;
  printer.doc(enumName, description);
  printer.block(
    `public enum ${enumName} implements WireValue {`,
    () => {
      values.forEach((value, index) => {
        const literal = typeof value === 'string' ? javaString(value) : `${value}L`;
        printer.line(`${members[index]}(${literal})${index < values.length - 1 ? ',' : ';'}`);
      });
      printer.blank();
      printer.line(`private final ${wireType} wire;`);
      printer.blank();
      printer.block(
        `${enumName}(${wireType} wire) {`,
        () => {
          printer.line('this.wire = wire;');
        },
        '}'
      );
      printer.blank();
      printer.line('@Override');
      printer.block(
        `public ${wireType} wire() {`,
        () => {
          printer.line('return wire;');
        },
        '}'
      );
      printer.blank();
      printer.line(
        '/** The member for a wire value; null for null, an exception for an unknown value. */'
      );
      printer.block(
        `public static ${enumName} fromWire(${wireType} wire) {`,
        () => {
          printer.block(
            'if (wire == null) {',
            () => {
              printer.line('return null;');
            },
            '}'
          );
          printer.block(
            `for (${enumName} member : values()) {`,
            () => {
              printer.block(
                'if (member.wire.equals(wire)) {',
                () => {
                  printer.line('return member;');
                },
                '}'
              );
            },
            '}'
          );
          printer.line(`throw new IllegalArgumentException("Unknown ${enumName} value: " + wire);`);
        },
        '}'
      );
    },
    '}'
  );
  printer.blank();
}

/** Write every named schema at the printer's current depth: records, enums, union dispatchers. */
export function writeJavaModels(
  printer: JavaPrinter,
  model: ApiModel,
  dateType: DateType = 'string'
): void {
  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined && (asEnum.scalar === 'string' || asEnum.scalar === 'integer')) {
      writeEnum(printer, name, asEnum.values, asEnum.scalar, schema.description);
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeRecord(
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
      const union = typeName(name);
      const sealed = classify(name, model) === 'union';
      const table = cases.cases
        .map((entry) => `${entry.value} -> ${typeName(entry.schemaName)}`)
        .join(', ');
      // The table carries the description's own values, so it goes through the comment escaper.
      printer.doc(union, `A discriminated union on ${javaString(cases.property)}: ${table}.`);
      if (sealed) {
        // The permitted records sit in the same compilation unit, so `permits` is implied.
        printer.line(`public sealed interface ${union} extends JsonValue {}`);
        printer.blank();
      }
      // A target without a record of its own keeps the raw value, so the union is `Object`.
      printer.block(
        `public static ${sealed ? union : 'Object'} parse${union}(Object json) {`,
        () => {
          printer.line('Map<String, Object> data = asObject(json);');
          printer.block(
            'if (data == null) {',
            () => {
              printer.line('return null;');
            },
            '}'
          );
          printer.block(
            `switch (String.valueOf(data.get(${javaString(cases.property)}))) {`,
            () => {
              for (const entry of cases.cases) {
                const target = { kind: 'ref', name: entry.schemaName } as const;
                const typed = hydration(target, 'data', model, dateType) ?? 'data';
                printer.line(`case ${javaString(entry.value)}:`);
                printer.indent(() => printer.line(`return ${typed};`));
              }
              printer.line('default:');
              printer.indent(() =>
                printer.line(
                  sealed
                    ? `throw new IllegalArgumentException("Unknown ${cases.property} value: " + data.get(${javaString(cases.property)}));`
                    : 'return data;'
                )
              );
            },
            '}'
          );
        },
        '}'
      );
      printer.blank();
      continue;
    }
    // Everything else (plain unions, aliases, records) has no Java declaration;
    // references resolve to the underlying type via javaType.
  }
}

/** Render every named schema at depth 0 — the models section on its own, for the render bars. */
export function renderJavaModels(model: ApiModel, dateType: DateType = 'string'): string {
  const printer = new JavaPrinter();
  writeJavaModels(printer, model, dateType);
  return printer.toString();
}
