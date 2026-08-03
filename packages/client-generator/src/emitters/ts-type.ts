// TypeScript TYPES as source text — the template-based replacement for the AST
// printer path (`schemaToTypeNode` + `printNodes`). Pure string logic over the
// IR: no `typescript` import, so the sdk generator joins the same TS-free
// authoring model as python/go/php. Formatting matches the printer (4-space
// indent, double quotes, union/intersection parenthesization) so the migration
// does not churn generated output shape.

import type {
  NamedSchemaModel,
  PropertyModel,
  ScalarKind,
  SchemaMetadata,
  SchemaModel,
} from '../intermediate-representation/model.js';
import { isIdentifier, safeIdent } from './identifier.js';
import { escapeJsDoc, jsdocText } from './jsdoc.js';
import type { DateType } from './types.js';

const INDENT = '    ';

/** A JSDoc block (description + metadata tags) as indented lines, or [] when empty. */
export function tsJsdoc(
  text: string | undefined,
  metadata: SchemaMetadata | undefined,
  indent: string
): string[] {
  const body = jsdocText(text, metadata);
  if (body === undefined) return [];
  return [
    `${indent}/**`,
    ...escapeJsDoc(body)
      .split('\n')
      .map((line) => `${indent} * ${line}`.replace(/ +$/, '')),
    `${indent} */`,
  ];
}

function literalType(value: string | number | boolean): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value);
}

function scalarType(
  kind: ScalarKind,
  metadata: SchemaMetadata | undefined,
  dateType: DateType
): string {
  switch (kind) {
    case 'string':
      if (metadata?.format === 'binary') return 'Blob';
      if (
        dateType === 'Date' &&
        (metadata?.format === 'date-time' || metadata?.format === 'date')
      ) {
        return 'Date';
      }
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
  }
}

/** True when the rendered type needs parentheses as an array element / intersection member. */
function isCompound(schema: SchemaModel): boolean {
  return (
    schema.kind === 'union' ||
    schema.kind === 'intersection' ||
    (schema.kind === 'enum' && schema.values.length > 1)
  );
}

/** The TypeScript type for an IR schema, rendered at `indent` (the containing line's indent). */
export function tsType(schema: SchemaModel, dateType: DateType = 'string', indent = ''): string {
  switch (schema.kind) {
    case 'scalar':
      return scalarType(schema.scalar, schema.metadata, dateType);
    case 'ref':
      return schema.name;
    case 'literal':
      return literalType(schema.value);
    case 'enum':
      return schema.values.map(literalType).join(' | ');
    case 'null':
      return 'null';
    case 'unknown':
      return 'unknown';
    case 'array': {
      const element = tsType(schema.items, dateType, indent);
      return isCompound(schema.items) ? `(${element})[]` : `${element}[]`;
    }
    case 'record':
      return `Record<string, ${tsType(schema.value, dateType, indent)}>`;
    case 'object': {
      if (schema.properties.length === 0) return '{}';
      const inner = indent + INDENT;
      const lines = schema.properties.flatMap((property) =>
        propertyLines(property, dateType, inner)
      );
      return `{\n${lines.join('\n')}\n${indent}}`;
    }
    case 'union':
      return schema.members
        .map((member) => {
          const rendered = tsType(member, dateType, indent);
          return isCompound(member) ? `(${rendered})` : rendered;
        })
        .join(' | ');
    case 'intersection':
      return schema.members
        .map((member) => {
          const rendered = tsType(member, dateType, indent);
          return isCompound(member) ? `(${rendered})` : rendered;
        })
        .join(' & ');
    case 'omit':
      return `Omit<${schema.base}, ${schema.keys.map((key) => JSON.stringify(key)).join(' | ')}>`;
  }
}

function propertyLines(property: PropertyModel, dateType: DateType, indent: string): string[] {
  const name = safeIdent(property.name);
  const readonly = property.readOnly ? 'readonly ' : '';
  const optional = property.required ? '' : '?';
  const type = tsType(property.schema, dateType, indent);
  return [
    ...tsJsdoc(property.description, property.schema.metadata, indent),
    `${indent}${readonly}${name}${optional}: ${type};`,
  ];
}

/**
 * For a named **string** enum whose values are all valid identifiers, the runtime
 * companion `export const X = { a: "a", … } as const;` (cohabiting with the type).
 */
function enumConstLines(named: NamedSchemaModel): string[] {
  const schema = named.schema;
  if (schema.kind !== 'enum' || schema.scalar !== 'string') return [];
  if (!schema.values.every((value) => typeof value === 'string' && isIdentifier(value))) return [];
  return [
    `export const ${named.name} = {`,
    ...schema.values.map(
      (value, index) =>
        `${INDENT}${value}: ${JSON.stringify(value)}${index === schema.values.length - 1 ? '' : ','}`
    ),
    '} as const;',
  ];
}

/** The model type aliases (with JSDoc and enum const companions), blank-line separated. */
export function renderTypeAliases(
  schemas: NamedSchemaModel[],
  dateType: DateType = 'string'
): string {
  const blocks: string[] = [];
  for (const named of schemas) {
    const lines = [
      ...tsJsdoc(named.schema.description ?? named.description, named.schema.metadata, ''),
      `export type ${named.name} = ${tsType(named.schema, dateType)};`,
    ];
    blocks.push(lines.join('\n'));
    const constCompanion = enumConstLines(named);
    if (constCompanion.length > 0) blocks.push(constCompanion.join('\n'));
  }
  return blocks.join('\n\n');
}
