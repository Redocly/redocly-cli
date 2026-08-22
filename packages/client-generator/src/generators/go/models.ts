// The `models` stage: named schemas as typed-const enums, structs with json tags
// (allOf flattened), and discriminated unions with unmarshal dispatchers.

import {
  type ApiModel,
  casing,
  type DateType,
  discriminatorCases,
  enumValues,
  flattenAllOf,
  type PropertyModel,
} from '@redocly/client-generator';
import { exported, GoPrinter } from '@redocly/client-generator/printers/go';

import { naming } from './naming.js';
import { goType } from './types.js';

function writeStruct(
  printer: GoPrinter,
  name: string,
  properties: PropertyModel[],
  dateType: DateType,
  description?: string
): void {
  printer.doc(exported(name), description);
  printer.block(
    `type ${exported(name)} struct {`,
    () => {
      for (const property of properties) {
        const field = exported(property.name);
        let fieldType = goType(property.schema, dateType);
        let tag = `\`json:"${property.name}"\``;
        if (!property.required) {
          if (
            !fieldType.startsWith('*') &&
            !fieldType.startsWith('[]') &&
            !fieldType.startsWith('map[') &&
            fieldType !== 'any'
          ) {
            fieldType = `*${fieldType}`;
          }
          tag = `\`json:"${property.name},omitempty"\``;
        }
        printer.line(`${field} ${fieldType} ${tag}`);
      }
    },
    '}'
  );
  printer.blank();
}

/** Render every named schema: typed-const enums, structs (allOf flattened), union dispatchers. */
export function renderGoModels(model: ApiModel, dateType: DateType = 'string'): string {
  const printer = new GoPrinter();
  printer.line('package client');
  printer.blank();
  const needsJSON = model.schemas.some(
    ({ schema }) => discriminatorCases(schema, model) !== undefined
  );
  if (needsJSON) {
    printer.line('import "encoding/json"');
    printer.blank();
  }
  // The models section also compiles standalone (see the unit bars), so it declares
  // its own `time` import when a field is a date.
  const body = renderGoModelBodies(model, dateType);
  if (dateType === 'Date' && body.includes('time.Time')) {
    printer.line('import "time"');
    printer.blank();
  }
  printer.line(body);
  return printer.toString();
}

/** The struct/enum/union declarations themselves — the header is renderGoModels' job. */
function renderGoModelBodies(model: ApiModel, dateType: DateType): string {
  const printer = new GoPrinter();

  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'string' : 'int64';
      printer.doc(exported(name), schema.description);
      printer.line(`type ${exported(name)} ${base}`);
      printer.blank();
      printer.block(
        'const (',
        () => {
          // Two values may fold to one pascal name (`1.5` and `15`) — a duplicate const
          // would not compile, so the names are made unique per enum. A digit-leading
          // value needs no `_` prefix here: the member starts with the type name.
          const used = new Set<string>();
          asEnum.values.forEach((value) => {
            const base = casing.pascal(String(value)) || 'Value';
            let suffix = '';
            for (let n = 2; used.has(base + suffix); n++) suffix = String(n);
            used.add(base + suffix);
            const member = exported(name) + base + suffix;
            printer.line(`${member} ${exported(name)} = ${naming.literal(value)}`);
          });
        },
        ')'
      );
      printer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeStruct(
          printer,
          name,
          flat.properties,
          dateType,
          flat.description ?? schema.description
        );
        continue;
      }
    }
    const cases = discriminatorCases(schema, model);
    if (cases !== undefined) {
      const typeName = exported(name);
      const table = cases.cases
        .map((entry) => `${entry.value} -> ${exported(entry.schemaName)}`)
        .join(', ');
      printer.line(`// ${typeName} is a discriminated union ("${cases.property}"): ${table}.`);
      printer.line(`type ${typeName} = any`);
      printer.blank();
      printer.line(
        `// Unmarshal${typeName} decodes into the member selected by "${cases.property}".`
      );
      printer.block(
        `func Unmarshal${typeName}(data []byte) (${typeName}, error) {`,
        () => {
          printer.block(
            'var probe struct {',
            () => {
              printer.line(`Discriminant string \`json:"${cases.property}"\``);
            },
            '}'
          );
          printer.block(
            'if err := json.Unmarshal(data, &probe); err != nil {',
            () => {
              printer.line('return nil, err');
            },
            '}'
          );
          // gofmt keeps `case` at the switch's own indent, so the switch body is NOT
          // indented as a block — only each case's statements are.
          printer.line('switch probe.Discriminant {');
          for (const entry of cases.cases) {
            printer.block(`case ${naming.string(entry.value)}:`, () => {
              printer.line(`var value ${exported(entry.schemaName)}`);
              printer.line('err := json.Unmarshal(data, &value)');
              printer.line('return value, err');
            });
          }
          printer.line('}');
          printer.line('var fallback any');
          printer.line('err := json.Unmarshal(data, &fallback)');
          printer.line('return fallback, err');
        },
        '}'
      );
      printer.blank();
      continue;
    }
    // Everything else (plain unions, scalar aliases, records) becomes a type alias.
    printer.doc(exported(name), schema.description);
    printer.line(`type ${exported(name)} = ${goType(schema, dateType)}`);
    printer.blank();
  }
  return printer.toString();
}
