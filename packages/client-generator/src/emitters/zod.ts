// Emits Zod schemas from the IR. Each named schema becomes an
// `export const <Name>Schema = z.<…>;` built with `ts.factory`, mirroring the
// type emitter (`types.ts`) but targeting runtime validators instead of types.
//
// Only the refinement methods stable across zod 3.23 and 4 are emitted
// (`.min/.max/.int/.gt/.lt/.regex`); format helpers (`.email/.uuid/.url`) diverge
// between major versions and are deferred. Refs become `z.lazy(() => …Schema)`,
// which sidesteps declaration ordering and recursion uniformly.

import type {
  NamedSchemaModel,
  PropertyModel,
  ScalarKind,
  SchemaMetadata,
  SchemaModel,
} from '../intermediate-representation/model.js';
import { safeIdent } from './identifier.js';
import { pascalCase } from './support.js';
import { printStatements, ts } from './ts.js';

const { factory } = ts;

/** `<Name>Schema` — the const identifier a named schema is bound to. */
function schemaConstName(name: string): string {
  return `${pascalCase(name)}Schema`;
}

/** `z` member access: `z.<method>`. */
function zMember(method: string): ts.Expression {
  return factory.createPropertyAccessExpression(factory.createIdentifier('z'), method);
}

/** `z.<method>(...args)`. */
function zCall(method: string, args: ts.Expression[] = []): ts.CallExpression {
  return factory.createCallExpression(zMember(method), undefined, args);
}

/** `<expr>.<method>(...args)` — chains a refinement onto a base expression. */
function chain(expr: ts.Expression, method: string, args: ts.Expression[] = []): ts.CallExpression {
  return factory.createCallExpression(
    factory.createPropertyAccessExpression(expr, method),
    undefined,
    args
  );
}

function numberLiteral(value: number): ts.Expression {
  return value < 0
    ? factory.createPrefixUnaryExpression(
        ts.SyntaxKind.MinusToken,
        factory.createNumericLiteral(-value)
      )
    : factory.createNumericLiteral(value);
}

function literalExpression(value: string | number | boolean): ts.Expression {
  if (typeof value === 'string') return factory.createStringLiteral(value);
  if (typeof value === 'boolean') return value ? factory.createTrue() : factory.createFalse();
  return numberLiteral(value);
}

/** Map an IR schema to the Zod expression that validates it. */
export function schemaToZodExpression(schema: SchemaModel): ts.Expression {
  return withRefinements(baseExpression(schema), schema);
}

function baseExpression(schema: SchemaModel): ts.Expression {
  switch (schema.kind) {
    case 'scalar':
      return scalarExpression(schema.scalar, schema.metadata);
    case 'object':
      return objectExpression(schema.properties);
    case 'array':
      return zCall('array', [schemaToZodExpression(schema.items)]);
    case 'record':
      return zCall('record', [zCall('string'), schemaToZodExpression(schema.value)]);
    case 'ref':
      return lazyRef(schema.name);
    case 'literal':
      return zCall('literal', [literalExpression(schema.value)]);
    case 'enum':
      return enumExpression(schema.values);
    case 'union':
      return unionExpression(schema.members);
    case 'intersection':
      return intersectionExpression(schema.members);
    case 'null':
      return zCall('null');
    case 'unknown':
      return zCall('unknown');
    case 'omit':
      return omitExpression(schema.base, schema.keys);
  }
}

function scalarExpression(scalar: ScalarKind, metadata?: SchemaMetadata): ts.Expression {
  switch (scalar) {
    case 'string':
      // `format: binary` is typed as `Blob` (see types.ts); validate it as one so the zod
      // schema agrees with the generated type instead of expecting a string.
      if (metadata?.format === 'binary') {
        return zCall('instanceof', [factory.createIdentifier('Blob')]);
      }
      return zCall('string');
    case 'integer':
      return chain(zCall('number'), 'int');
    case 'number':
      return zCall('number');
    case 'boolean':
      return zCall('boolean');
  }
}

/** `z.object({ <key>: <expr>(.optional() when !required), … })`. */
function objectExpression(properties: PropertyModel[]): ts.Expression {
  const props = properties.map((p) => {
    const value = p.required
      ? schemaToZodExpression(p.schema)
      : chain(schemaToZodExpression(p.schema), 'optional');
    const safe = safeIdent(p.name);
    const key =
      safe === p.name ? factory.createIdentifier(p.name) : factory.createStringLiteral(p.name);
    return factory.createPropertyAssignment(key, value);
  });
  return zCall('object', [factory.createObjectLiteralExpression(props, props.length > 0)]);
}

/** `z.lazy(() => <Name>Schema)` — defers reference resolution to call time. */
function lazyRef(name: string): ts.Expression {
  const arrow = factory.createArrowFunction(
    undefined,
    undefined,
    [],
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    factory.createIdentifier(schemaConstName(name))
  );
  return zCall('lazy', [arrow]);
}

/** All-string values → `z.enum([…])`; otherwise → a union of literals. */
function enumExpression(values: Array<string | number | boolean>): ts.Expression {
  if (values.every((v) => typeof v === 'string')) {
    return zCall('enum', [
      factory.createArrayLiteralExpression(
        values.map((v) => factory.createStringLiteral(v as string)),
        false
      ),
    ]);
  }
  return zCall('union', [
    factory.createArrayLiteralExpression(
      values.map((v) => zCall('literal', [literalExpression(v)])),
      false
    ),
  ]);
}

/** `z.union([…])`; a single member collapses to that member's expression. */
function unionExpression(members: SchemaModel[]): ts.Expression {
  const exprs = members.map(schemaToZodExpression);
  if (exprs.length === 1) return exprs[0];
  return zCall('union', [factory.createArrayLiteralExpression(exprs, false)]);
}

/** `a.and(b).and(c)` — left-folds `.and` over the members. */
function intersectionExpression(members: SchemaModel[]): ts.Expression {
  const exprs = members.map(schemaToZodExpression);
  return exprs.reduce((acc, next) => chain(acc, 'and', [next]));
}

/** `<Base>Schema.omit({ k1: true, … })`. */
function omitExpression(base: string, keys: string[]): ts.Expression {
  const mask = factory.createObjectLiteralExpression(
    keys.map((k) => {
      const safe = safeIdent(k);
      const key = safe === k ? factory.createIdentifier(k) : factory.createStringLiteral(k);
      return factory.createPropertyAssignment(key, factory.createTrue());
    }),
    false
  );
  return chain(factory.createIdentifier(schemaConstName(base)), 'omit', [mask]);
}

/**
 * Chain the stable-subset metadata refinements onto `expr`. Order: numeric/length
 * bounds, then `.regex` (the `.int()` for integers is already on the base).
 * `.optional()` is NOT applied here — optionality is a property-level concern
 * handled in `objectExpression`, so a top-level schema is never spuriously optional.
 */
function withRefinements(expr: ts.Expression, schema: SchemaModel): ts.Expression {
  const m = schema.metadata;
  if (!m) return expr;
  let out = expr;
  if (schema.kind === 'scalar' && schema.scalar === 'string') {
    if (m.minLength !== undefined) out = chain(out, 'min', [numberLiteral(m.minLength)]);
    if (m.maxLength !== undefined) out = chain(out, 'max', [numberLiteral(m.maxLength)]);
    if (m.pattern !== undefined) out = chain(out, 'regex', [regexExpression(m.pattern)]);
  }
  if (schema.kind === 'scalar' && (schema.scalar === 'number' || schema.scalar === 'integer')) {
    out = numericRefinements(out, m);
  }
  if (schema.kind === 'array') {
    if (m.minItems !== undefined) out = chain(out, 'min', [numberLiteral(m.minItems)]);
    if (m.maxItems !== undefined) out = chain(out, 'max', [numberLiteral(m.maxItems)]);
  }
  return out;
}

function numericRefinements(expr: ts.Expression, m: SchemaMetadata): ts.Expression {
  let out = expr;
  if (m.minimum !== undefined) out = chain(out, 'min', [numberLiteral(m.minimum)]);
  if (m.maximum !== undefined) out = chain(out, 'max', [numberLiteral(m.maximum)]);
  if (m.exclusiveMinimum !== undefined) out = chain(out, 'gt', [numberLiteral(m.exclusiveMinimum)]);
  if (m.exclusiveMaximum !== undefined) out = chain(out, 'lt', [numberLiteral(m.exclusiveMaximum)]);
  return out;
}

/** `new RegExp("<pattern>")` — robust across printers regardless of pattern content. */
function regexExpression(pattern: string): ts.Expression {
  return factory.createNewExpression(factory.createIdentifier('RegExp'), undefined, [
    factory.createStringLiteral(pattern),
  ]);
}

/** `export const <Name>Schema = <expr>;` for one named schema. */
function schemaConstStatement(named: NamedSchemaModel): ts.Statement {
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          schemaConstName(named.name),
          undefined,
          undefined,
          schemaToZodExpression(named.schema)
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

/** `import { z } from 'zod';` */
function zodImport(): ts.Statement {
  return factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      false,
      undefined,
      factory.createNamedImports([
        factory.createImportSpecifier(false, undefined, factory.createIdentifier('z')),
      ])
    ),
    factory.createStringLiteral('zod')
  );
}

/** The zod module statements: the `z` import followed by one const per schema. */
export function zodModuleStatements(schemas: NamedSchemaModel[]): ts.Statement[] {
  return [zodImport(), ...schemas.map(schemaConstStatement)];
}

/** Render the full zod module source. `''` when there are no schemas. */
export function renderZodModule(schemas: NamedSchemaModel[]): string {
  if (schemas.length === 0) return '';
  return printStatements(zodModuleStatements(schemas));
}
