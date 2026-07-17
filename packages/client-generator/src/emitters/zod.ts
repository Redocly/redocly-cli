// Emits Zod schemas from the IR. Each named schema becomes an
// `export const <Name>Schema = z.<…>;` built with `ts.factory`, mirroring the
// type emitter (`types.ts`) but targeting runtime validators instead of types.
// Operations with a JSON request or response body additionally land in the
// `operationSchemas` map, which powers the `zodValidation` client middleware.
//
// Only the refinement methods stable across zod 3.23 and 4 are emitted
// (`.min/.max/.int/.gt/.lt/.regex`); format helpers (`.email/.uuid/.url`) diverge
// between major versions and are deferred. Refs become `z.lazy(() => …Schema)`,
// which sidesteps declaration ordering and recursion uniformly.

import {
  allOperations,
  type ApiModel,
  type NamedSchemaModel,
  type PropertyModel,
  type ScalarKind,
  type SchemaMetadata,
  type SchemaModel,
} from '../intermediate-representation/model.js';
import { safeIdent } from './identifier.js';
import { isSseOp } from './sse.js';
import { pascalCase } from './support.js';
import { jsdoc, literalExpression, printStatements, ts } from './ts.js';

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

type SchemaByName = ReadonlyMap<string, SchemaModel>;

const NO_SCHEMAS: SchemaByName = new Map();

/** Map an IR schema to the Zod expression that validates it. */
export function schemaToZodExpression(
  schema: SchemaModel,
  byName: SchemaByName = NO_SCHEMAS
): ts.Expression {
  return withRefinements(baseExpression(schema, byName), schema);
}

function baseExpression(schema: SchemaModel, byName: SchemaByName): ts.Expression {
  switch (schema.kind) {
    case 'scalar':
      return scalarExpression(schema.scalar, schema.metadata);
    case 'object':
      return objectExpression(schema.properties, byName);
    case 'array':
      return zCall('array', [schemaToZodExpression(schema.items, byName)]);
    case 'record':
      return zCall('record', [zCall('string'), schemaToZodExpression(schema.value, byName)]);
    case 'ref':
      return lazyRef(schema.name);
    case 'literal':
      return zCall('literal', [literalExpression(schema.value)]);
    case 'enum':
      return enumExpression(schema.values);
    case 'union':
      return unionExpression(schema.members, byName);
    case 'intersection':
      return intersectionExpression(schema.members, byName);
    case 'null':
      return zCall('null');
    case 'unknown':
      return zCall('unknown');
    case 'omit':
      return omitExpression(schema.base, schema.keys, byName);
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
function objectExpression(properties: PropertyModel[], byName: SchemaByName): ts.Expression {
  const props = properties.map((p) => {
    const value = p.required
      ? schemaToZodExpression(p.schema, byName)
      : chain(schemaToZodExpression(p.schema, byName), 'optional');
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
function unionExpression(members: SchemaModel[], byName: SchemaByName): ts.Expression {
  const exprs = members.map((member) => schemaToZodExpression(member, byName));
  if (exprs.length === 1) return exprs[0];
  return zCall('union', [factory.createArrayLiteralExpression(exprs, false)]);
}

/** `a.and(b).and(c)` — left-folds `.and` over the members. */
function intersectionExpression(members: SchemaModel[], byName: SchemaByName): ts.Expression {
  const exprs = members.map((member) => schemaToZodExpression(member, byName));
  return exprs.reduce((acc, next) => chain(acc, 'and', [next]));
}

/**
 * `<Base>Schema.omit({ k1: true, … })` when the base is a plain object schema.
 * `.omit` exists only on `ZodObject` — for any other base (an `allOf` intersection,
 * a union, …) the omission is distributed into the base's object members instead.
 */
function omitExpression(base: string, keys: string[], byName: SchemaByName): ts.Expression {
  const target = byName.get(base);
  if (target && target.kind !== 'object') {
    return schemaToZodExpression(applyOmit(target, keys, byName, new Set([base])), byName);
  }
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
 * Remove `keys` from a schema that is not a plain object: objects drop the properties,
 * union/intersection members recurse, and a ref to an object becomes `<Ref>Schema.omit`
 * with only the keys that exist on it (zod's mask rejects unknown keys at the type
 * level). Cycles and non-object leaves return unchanged — there is nothing to omit.
 */
function applyOmit(
  schema: SchemaModel,
  keys: string[],
  byName: SchemaByName,
  seen: Set<string>
): SchemaModel {
  switch (schema.kind) {
    case 'object':
      return { ...schema, properties: schema.properties.filter((p) => !keys.includes(p.name)) };
    case 'union':
    case 'intersection':
      return {
        ...schema,
        members: schema.members.map((member) => applyOmit(member, keys, byName, seen)),
      };
    case 'ref': {
      if (seen.has(schema.name)) return schema;
      const target = byName.get(schema.name);
      if (!target) return schema;
      if (target.kind === 'object') {
        const present = keys.filter((key) =>
          target.properties.some((property) => property.name === key)
        );
        return present.length > 0 ? { kind: 'omit', base: schema.name, keys: present } : schema;
      }
      return applyOmit(target, keys, byName, new Set([...seen, schema.name]));
    }
    default:
      return schema;
  }
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
    if (m.minLength !== undefined) out = chain(out, 'min', [literalExpression(m.minLength)]);
    if (m.maxLength !== undefined) out = chain(out, 'max', [literalExpression(m.maxLength)]);
    if (m.pattern !== undefined) out = chain(out, 'regex', [regexExpression(m.pattern)]);
  }
  if (schema.kind === 'scalar' && (schema.scalar === 'number' || schema.scalar === 'integer')) {
    out = numericRefinements(out, m);
  }
  if (schema.kind === 'array') {
    if (m.minItems !== undefined) out = chain(out, 'min', [literalExpression(m.minItems)]);
    if (m.maxItems !== undefined) out = chain(out, 'max', [literalExpression(m.maxItems)]);
  }
  return out;
}

function numericRefinements(expr: ts.Expression, m: SchemaMetadata): ts.Expression {
  let out = expr;
  if (m.minimum !== undefined) out = chain(out, 'min', [literalExpression(m.minimum)]);
  if (m.maximum !== undefined) out = chain(out, 'max', [literalExpression(m.maximum)]);
  if (m.exclusiveMinimum !== undefined)
    out = chain(out, 'gt', [literalExpression(m.exclusiveMinimum)]);
  if (m.exclusiveMaximum !== undefined)
    out = chain(out, 'lt', [literalExpression(m.exclusiveMaximum)]);
  return out;
}

/** `new RegExp("<pattern>")` — robust across printers regardless of pattern content. */
function regexExpression(pattern: string): ts.Expression {
  return factory.createNewExpression(factory.createIdentifier('RegExp'), undefined, [
    factory.createStringLiteral(pattern),
  ]);
}

/** `export const <Name>Schema = <expr>;` for one named schema. */
function schemaConstStatement(named: NamedSchemaModel, byName: SchemaByName): ts.Statement {
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          schemaConstName(named.name),
          undefined,
          undefined,
          schemaToZodExpression(named.schema, byName)
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

/**
 * `<opName>: { request?: <expr>, response?: <expr> }` for every non-SSE operation with a
 * JSON request or response body — the operation's validators, keyed by the same id the
 * middleware sees at runtime (`ctx.operation.id`). SSE, binary, text, and void bodies
 * have no JSON payload to validate and are skipped.
 */
type OperationSchemaEntry = { name: string; request?: ts.Expression; response?: ts.Expression };

function operationSchemaEntries(model: ApiModel, byName: SchemaByName): OperationSchemaEntry[] {
  const entries: OperationSchemaEntry[] = [];
  for (const op of allOperations(model.services)) {
    if (isSseOp(op)) continue;
    const requestBody = op.requestBody;
    const request =
      requestBody && requestBody.contentType.toLowerCase().includes('json')
        ? schemaToZodExpression(requestBody.schema, byName)
        : undefined;
    const jsonResponse = op.successResponses.find((response) =>
      response.contentType.toLowerCase().includes('json')
    );
    const response = jsonResponse ? schemaToZodExpression(jsonResponse.schema, byName) : undefined;
    if (!request && !response) continue;
    entries.push({ name: op.name, request, response });
  }
  return entries;
}

function operationSchemasStatement(entries: OperationSchemaEntry[]): ts.Statement {
  const zodTypeNode = () =>
    factory.createTypeReferenceNode(
      factory.createQualifiedName(factory.createIdentifier('z'), 'ZodType')
    );
  // The explicit `z.ZodType` annotation keeps the declaration-emit size proportional to
  // the operation count: the inferred type would serialize every schema's zod generics
  // and overflow tsc's limit (TS7056) on large APIs under `declaration: true`.
  const typeMembers = entries.map((entry) =>
    factory.createPropertySignature(
      undefined,
      entry.name,
      undefined,
      factory.createTypeLiteralNode(
        [
          entry.request
            ? factory.createPropertySignature(undefined, 'request', undefined, zodTypeNode())
            : undefined,
          entry.response
            ? factory.createPropertySignature(undefined, 'response', undefined, zodTypeNode())
            : undefined,
        ].filter((member) => member !== undefined)
      )
    )
  );
  const valueEntries = entries.map((entry) =>
    factory.createPropertyAssignment(
      entry.name,
      factory.createObjectLiteralExpression(
        [
          entry.request ? factory.createPropertyAssignment('request', entry.request) : undefined,
          entry.response ? factory.createPropertyAssignment('response', entry.response) : undefined,
        ].filter((property) => property !== undefined),
        false
      )
    )
  );
  return jsdoc(
    factory.createVariableStatement(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            'operationSchemas',
            undefined,
            factory.createTypeLiteralNode(typeMembers),
            factory.createObjectLiteralExpression(valueEntries, true)
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    'Request/response validators by operationId — powers `zodValidation`, or import one directly.'
  );
}

// The validation middleware, spliced verbatim after the schemas (matches the printer's
// double-quote/4-space style). Structurally compatible with the client's `Middleware`
// without importing it, so the zod module keeps its single `zod` dependency.
const VALIDATION_SUPPORT = `/** \`request\`/\`response\` validators for one operation (an absent side is not validated). */
export type OperationSchemaSet = { request?: z.ZodType; response?: z.ZodType };

const schemaIndex: Partial<Record<string, OperationSchemaSet>> = operationSchemas;

/** A request or response payload failed validation. Always thrown, even on result-mode clients. */
export class ZodValidationError extends Error {
    constructor(
        readonly operationId: string,
        readonly direction: "request" | "response",
        readonly issues: z.ZodError["issues"]
    ) {
        const detail = issues
            .map((issue) => \`\${issue.path.join(".") || "(root)"}: \${issue.message}\`)
            .join("; ");
        super(\`\${direction === "request" ? "Request" : "Response"} validation failed for operation "\${operationId}": \${detail}\`);
        this.name = "ZodValidationError";
    }
}

/**
 * Schema-validation middleware for the generated client: \`use(zodValidation())\`.
 * Request bodies are validated before any network call; successful JSON responses are
 * validated against the operation's response schema. Payloads are never mutated, and
 * operations without a schema pass through untouched. A failure throws
 * \`ZodValidationError\` — always, even on result-mode clients.
 */
export function zodValidation(options: { request?: boolean; response?: boolean } = {}) {
    const { request = true, response = true } = options;
    return {
        onRequest(context: { body?: unknown; operation: { id: string } }): void {
            if (!request || context.body === undefined) return;
            const schema = schemaIndex[context.operation.id]?.request;
            if (!schema) return;
            const result = schema.safeParse(context.body);
            if (!result.success) {
                throw new ZodValidationError(context.operation.id, "request", result.error.issues);
            }
        },
        async onResponse(incoming: Response, context: { operation: { id: string } }): Promise<void> {
            if (!response || !incoming.ok) return;
            const schema = schemaIndex[context.operation.id]?.response;
            if (!schema) return;
            const contentType = (incoming.headers.get("content-type") ?? "").toLowerCase();
            if (!contentType.includes("json")) return;
            const result = schema.safeParse(await incoming.clone().json());
            if (!result.success) {
                throw new ZodValidationError(context.operation.id, "response", result.error.issues);
            }
        },
    };
}`;

/**
 * Render the full zod module source: the component schemas, then — when any operation
 * has a JSON body — the `operationSchemas` map and the `zodValidation` middleware.
 * `''` when there is nothing to emit.
 */
export function renderZodModule(model: ApiModel): string {
  const byName: SchemaByName = new Map(model.schemas.map((named) => [named.name, named.schema]));
  const entries = operationSchemaEntries(model, byName);
  if (model.schemas.length === 0 && entries.length === 0) return '';
  const statements: ts.Statement[] = [
    zodImport(),
    ...model.schemas.map((named) => schemaConstStatement(named, byName)),
  ];
  if (entries.length === 0) return printStatements(statements);
  statements.push(operationSchemasStatement(entries));
  return `${printStatements(statements)}\n${VALIDATION_SUPPORT}\n`;
}
