import type {
  NamedSchemaModel,
  PropertyModel,
  ScalarKind,
  SchemaMetadata,
  SchemaModel,
} from '../intermediate-representation/model.js';
import { isIdentifier, safeIdent } from './identifier.js';
import { jsdocText } from './jsdoc.js';
import { jsdoc, printNodes, ts } from './ts.js';

const { factory } = ts;

/**
 * How named string enums are emitted:
 * - `'union'`: only the string-literal union type (`type X = "a" | "b"`).
 * - `'const-object'`: the union type *and* a sibling
 *   `export const X = { a: "a", b: "b" } as const;` so callers can reference
 *   the values at runtime (`X.a`).
 */
export type EnumStyle = 'union' | 'const-object';

/**
 * How `format: date-time`/`date` string fields are typed:
 * - `'string'` (default): the wire shape — an ISO string.
 * - `'Date'`: a `Date` reference. Opt-in; pair with the `transformers` generator
 *   so the runtime value matches (the client stays zero-dep — `Date` is standard).
 */
export type DateType = 'string' | 'Date';

/** The model type aliases (and const-object enum companions) as nodes. */
export function typesStatements(
  schemas: NamedSchemaModel[],
  enumStyle: EnumStyle,
  dateType: DateType = 'string'
): ts.Statement[] {
  const nodes: ts.Statement[] = [];
  for (const s of schemas) {
    nodes.push(
      jsdocOn(
        factory.createTypeAliasDeclaration(
          [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
          s.name,
          undefined,
          schemaToTypeNode(s.schema, dateType)
        ),
        s.schema.description ?? s.description,
        s.schema.metadata
      )
    );
    if (enumStyle === 'const-object') {
      const constObject = enumConstObject(s);
      if (constObject) nodes.push(constObject);
    }
  }
  return nodes;
}

/**
 * For a named **string** enum, build a runtime companion
 * `export const X = { a: "a", … } as const;` that cohabits with the same-named
 * type (TypeScript allows a type and value to share an identifier). This lets
 * callers reference values at runtime (`X.a`) instead of retyping literals.
 *
 * Returns `undefined` (so only the type union is emitted) when:
 * - the schema isn't a string enum (integer/boolean enums gain nothing), or
 * - any value isn't a valid JS identifier (e.g. `"menu:read"`) — we don't emit
 *   a half-usable object with quoted keys.
 */
function enumConstObject(named: NamedSchemaModel): ts.VariableStatement | undefined {
  const schema = named.schema;
  if (schema.kind !== 'enum' || schema.scalar !== 'string') return undefined;
  if (!schema.values.every((v) => typeof v === 'string' && isIdentifier(v))) return undefined;

  const object = factory.createObjectLiteralExpression(
    schema.values.map((v) =>
      factory.createPropertyAssignment(v as string, factory.createStringLiteral(v as string))
    ),
    true
  );
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          named.name,
          undefined,
          undefined,
          factory.createAsExpression(object, factory.createTypeReferenceNode('const'))
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

export function renderSchema(schema: SchemaModel, dateType: DateType = 'string'): string {
  return printNodes([schemaToTypeNode(schema, dateType)]);
}

/** Build the TypeScript type node for an IR schema. */
export function schemaToTypeNode(schema: SchemaModel, dateType: DateType = 'string'): ts.TypeNode {
  switch (schema.kind) {
    case 'scalar':
      return scalarTypeNode(schema.scalar, schema.metadata, dateType);
    case 'ref':
      return factory.createTypeReferenceNode(schema.name);
    case 'literal':
      return factory.createLiteralTypeNode(literalExpression(schema.value));
    case 'enum': {
      const members = schema.values.map((v) => factory.createLiteralTypeNode(literalExpression(v)));
      // A single-value enum is just that literal — wrapping it in a one-member
      // union would make the printer parenthesize it inside `T[]` (`("a")[]`).
      return members.length === 1 ? members[0] : factory.createUnionTypeNode(members);
    }
    case 'null':
      return factory.createLiteralTypeNode(factory.createNull());
    case 'unknown':
      return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
    case 'array':
      // The printer parenthesizes union/intersection element types itself
      // (`(string | null)[]`), so just hand it the element node.
      return factory.createArrayTypeNode(schemaToTypeNode(schema.items, dateType));
    case 'record':
      return factory.createTypeReferenceNode('Record', [
        factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        schemaToTypeNode(schema.value, dateType),
      ]);
    case 'object':
      return factory.createTypeLiteralNode(
        schema.properties.map((p) => propertySignature(p, dateType))
      );
    case 'union':
      return factory.createUnionTypeNode(schema.members.map((m) => schemaToTypeNode(m, dateType)));
    case 'intersection':
      return factory.createIntersectionTypeNode(
        schema.members.map((m) => schemaToTypeNode(m, dateType))
      );
    case 'omit':
      return factory.createTypeReferenceNode('Omit', [
        factory.createTypeReferenceNode(schema.base),
        factory.createUnionTypeNode(
          schema.keys.map((k) => factory.createLiteralTypeNode(factory.createStringLiteral(k)))
        ),
      ]);
  }
}

function propertySignature(p: PropertyModel, dateType: DateType): ts.PropertySignature {
  // `readOnly` (server-managed) props get the `readonly` modifier so consumer
  // write-type utilities (OmitReadOnly<T>) can strip them and assignment is
  // flagged. Request-body types already drop these via `Omit` in the IR.
  const modifiers = p.readOnly
    ? [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)]
    : undefined;
  const sig = factory.createPropertySignature(
    modifiers,
    propertyName(p.name),
    p.required ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
    schemaToTypeNode(p.schema, dateType)
  );
  return jsdocOn(sig, p.description, p.schema.metadata);
}

/** A property name: a bare identifier when valid, a quoted string literal otherwise. */
function propertyName(name: string): ts.PropertyName {
  const safe = safeIdent(name);
  return safe === name ? factory.createIdentifier(name) : factory.createStringLiteral(name);
}

function literalExpression(
  value: string | number | boolean
): ts.LiteralExpression | ts.BooleanLiteral | ts.PrefixUnaryExpression {
  if (typeof value === 'string') return factory.createStringLiteral(value);
  if (typeof value === 'boolean') return value ? factory.createTrue() : factory.createFalse();
  return value < 0
    ? factory.createPrefixUnaryExpression(
        ts.SyntaxKind.MinusToken,
        factory.createNumericLiteral(-value)
      )
    : factory.createNumericLiteral(value);
}

function scalarTypeNode(
  kind: ScalarKind,
  metadata: SchemaMetadata | undefined,
  dateType: DateType
): ts.TypeNode {
  switch (kind) {
    case 'string':
      // `format: binary` is raw byte content (file uploads / octet-stream), not text —
      // surface it as `Blob` (the web standard; a `File` is assignable to it). `byte`
      // (base64) stays a `string`.
      if (metadata?.format === 'binary') {
        return factory.createTypeReferenceNode('Blob');
      }
      // Opt-in: a `date-time`/`date` string surfaces as `Date` under `dateType:
      // 'Date'`; everything else (and the default) stays the `string` keyword.
      if (
        dateType === 'Date' &&
        (metadata?.format === 'date-time' || metadata?.format === 'date')
      ) {
        return factory.createTypeReferenceNode('Date');
      }
      return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    case 'number':
    case 'integer':
      return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
    case 'boolean':
      return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
  }
}

/** Attach a JSDoc block (description + metadata tags) to `node`, if any. */
function jsdocOn<T extends ts.Node>(
  node: T,
  text: string | undefined,
  metadata?: SchemaMetadata
): T {
  const body = jsdocText(text, metadata);
  return body === undefined ? node : jsdoc(node, body);
}
