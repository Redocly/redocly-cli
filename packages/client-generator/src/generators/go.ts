// The built-in `go` generator — the second non-TypeScript library entry,
// authored with the language-neutral toolkit only (same dogfooding invariant as
// the python generator, pinned by its guard test). Output is a single
// stdlib-only Go file: structs with json tags, typed-const enums, discriminated
// unions with unmarshal dispatchers, and a Client over the embedded runtime.

import {
  casing,
  CodeWriter,
  discriminatorCases,
  docText,
  enumValues,
  flattenAllOf,
  identifierFor,
  isNullable,
  RESERVED_WORDS,
  unwrapNullable,
} from '../authoring/index.js';
import type { ApiModel, PropertyModel, SchemaModel } from '../intermediate-representation/model.js';

const GO = RESERVED_WORDS.go;

/** An exported Go identifier (PascalCase; keywords can't collide since these start uppercase). */
function exported(name: string): string {
  return identifierFor(name, { style: 'pascal', reserved: GO });
}

/** The Go type for a schema; `required=false` optionals become pointers at the field site. */
export function goType(schema: SchemaModel): string {
  if (isNullable(schema)) {
    const inner = goType(unwrapNullable(schema));
    return inner.startsWith('*') || inner === 'any' ? inner : `*${inner}`;
  }
  switch (schema.kind) {
    case 'scalar':
      return { string: 'string', integer: 'int64', number: 'float64', boolean: 'bool' }[
        schema.scalar
      ];
    case 'array':
      return `[]${goType(schema.items)}`;
    case 'record':
      return `map[string]${goType(schema.value)}`;
    case 'ref':
      return exported(schema.name);
    case 'literal':
      return typeof schema.value === 'string'
        ? 'string'
        : typeof schema.value === 'boolean'
          ? 'bool'
          : 'float64';
    case 'enum':
      // Anonymous (inline) enums keep the wire scalar; only NAMED enums get types.
      return { string: 'string', integer: 'int64', number: 'float64', boolean: 'bool' }[
        schema.scalar
      ];
    case 'omit':
      // Go has no Omit; the base struct is the honest annotation (readOnly
      // fields are server-managed and simply omitted from requests).
      return exported(schema.base);
    case 'union':
    case 'null':
    case 'object':
    case 'intersection':
    case 'unknown':
      return 'any';
  }
}

function writeDocComment(writer: CodeWriter, name: string, description?: string): void {
  const lines = docText(description);
  if (lines.length === 0) return;
  writer.line(`// ${name} — ${lines[0]}`);
  for (const line of lines.slice(1)) writer.line(`// ${line}`);
}

function writeStruct(
  writer: CodeWriter,
  name: string,
  properties: PropertyModel[],
  description?: string
): void {
  writeDocComment(writer, exported(name), description);
  writer.block(
    `type ${exported(name)} struct {`,
    () => {
      for (const property of properties) {
        const field = exported(property.name);
        let fieldType = goType(property.schema);
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
        writer.line(`${field} ${fieldType} ${tag}`);
      }
    },
    '}'
  );
  writer.blank();
}

/** Render every named schema: typed-const enums, structs (allOf flattened), union dispatchers. */
export function renderGoModels(model: ApiModel): string {
  const writer = new CodeWriter('\t');
  writer.line('package client');
  writer.blank();
  const needsJSON = model.schemas.some(
    ({ schema }) => discriminatorCases(schema, model) !== undefined
  );
  if (needsJSON) {
    writer.line('import "encoding/json"');
    writer.blank();
  }

  for (const { name, schema } of model.schemas) {
    const asEnum = enumValues(schema);
    if (asEnum !== undefined) {
      const base = asEnum.scalar === 'string' ? 'string' : 'int64';
      writeDocComment(writer, exported(name), schema.description);
      writer.line(`type ${exported(name)} ${base}`);
      writer.blank();
      writer.block(
        'const (',
        () => {
          asEnum.values.forEach((value) => {
            const member = exported(name) + casing.pascal(String(value));
            writer.line(`${member} ${exported(name)} = ${JSON.stringify(value)}`);
          });
        },
        ')'
      );
      writer.blank();
      continue;
    }
    if (schema.kind === 'object' || schema.kind === 'intersection') {
      const flat = flattenAllOf(schema, model);
      if (flat !== undefined) {
        writeStruct(writer, name, flat.properties, flat.description ?? schema.description);
        continue;
      }
    }
    const cases = discriminatorCases(schema, model);
    if (cases !== undefined) {
      const typeName = exported(name);
      const table = cases.cases
        .map((entry) => `${entry.value} -> ${exported(entry.schemaName)}`)
        .join(', ');
      writer.line(`// ${typeName} is a discriminated union ("${cases.property}"): ${table}.`);
      writer.line(`type ${typeName} = any`);
      writer.blank();
      writer.line(
        `// Unmarshal${typeName} decodes into the member selected by "${cases.property}".`
      );
      writer.block(
        `func Unmarshal${typeName}(data []byte) (${typeName}, error) {`,
        () => {
          writer.block(
            'var probe struct {',
            () => {
              writer.line(`Discriminant string \`json:"${cases.property}"\``);
            },
            '}'
          );
          writer.block(
            'if err := json.Unmarshal(data, &probe); err != nil {',
            () => {
              writer.line('return nil, err');
            },
            '}'
          );
          writer.block(
            'switch probe.Discriminant {',
            () => {
              for (const entry of cases.cases) {
                writer.block(`case ${JSON.stringify(entry.value)}:`, () => {
                  writer.line(`var value ${exported(entry.schemaName)}`);
                  writer.line('err := json.Unmarshal(data, &value)');
                  writer.line('return value, err');
                });
              }
            },
            '}'
          );
          writer.line('var fallback any');
          writer.line('err := json.Unmarshal(data, &fallback)');
          writer.line('return fallback, err');
        },
        '}'
      );
      writer.blank();
      continue;
    }
    // Everything else (plain unions, scalar aliases, records) becomes a type alias.
    writeDocComment(writer, exported(name), schema.description);
    writer.line(`type ${exported(name)} = ${goType(schema)}`);
    writer.blank();
  }
  return writer.toString();
}
