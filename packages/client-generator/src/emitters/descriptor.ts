// Package-mode descriptor emission: the identifier plan for a generated module that
// shares scope with the `@redocly/client-generator` wiring, plus the `OPERATIONS`
// descriptor map (`satisfies Record<string, OperationDescriptor>` — the semver skew
// guard against the runtime contract in src/runtime/types.ts).

import type {
  ApiModel,
  OperationModel,
  SecuritySchemeModel,
} from '../intermediate-representation/model.js';
import type { SecuritySpec } from '../runtime/types.js';
import { allOperations } from '../writers/util.js';
import { authSetterNames } from './auth.js';
import { isIdentifier, uniqueIdent } from './identifier.js';
import { variablesTypeLiteral } from './operation-aliases.js';
import { operationSignature } from './operation-signature.js';
import { computeResponse, errorTypeNodes, isTypedMultipart } from './operation-types.js';
import type { EmitContext } from './operations.js';
import type { ModelPagination } from './pagination.js';
import { isSseOp, sseDataKind, sseEventType } from './sse.js';
import { pascalCase } from './support.js';
import { jsdoc, parseStatements, ts } from './ts.js';
import { type DateType, schemaToTypeNode } from './types.js';

const { factory } = ts;

/** Module-scope identifiers every package-mode file emits or imports — never renamed. */
const WIRING_NAMES = [
  'client',
  'OPERATIONS',
  'Ops',
  'OperationId',
  'OperationPath',
  'OperationTag',
  'createClient',
  'mergeSetup',
  'ApiError',
  'configure',
  'use',
  'auth',
  'ClientConfig',
  'RequestOptions',
  'SseOptions',
  'Middleware',
  'OperationDescriptor',
  'ServerSentEvent',
  'Result',
  'TokenProvider',
  '__redoclySetup',
];

/**
 * Operation-name → emitted-identifier plan. The full reserved set (wiring + imported
 * bindings + auth sugar, computed from the model FIRST) is seeded before any operation
 * is sanitized, so collisions rename the operation (`configure` → `configure_2`)
 * deterministically regardless of document order.
 */
export function packageIdents(model: ApiModel): Map<string, string> {
  const used = new Set<string>([...WIRING_NAMES, ...authSetterNames(model.securitySchemes)]);
  const idents = new Map<string, string>();
  for (const op of allOperations(model.services)) idents.set(op.name, uniqueIdent(op.name, used));
  return idents;
}

/** Plain JSON value → ts.Expression (strings/numbers/booleans/null/arrays/objects). */
export function literalExpr(value: unknown): ts.Expression {
  if (typeof value === 'string') return factory.createStringLiteral(value);
  if (typeof value === 'number') return factory.createNumericLiteral(value);
  if (typeof value === 'boolean') return value ? factory.createTrue() : factory.createFalse();
  if (value === null) return factory.createNull();
  if (Array.isArray(value)) {
    return factory.createArrayLiteralExpression(value.map(literalExpr), false);
  }
  return factory.createObjectLiteralExpression(
    // Keys quoted only when they fail the identifier GRAMMAR — reserved words
    // (the descriptor's `in` field) are legal bare object-literal keys.
    Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      factory.createPropertyAssignment(
        isIdentifier(k) ? k : factory.createStringLiteral(k),
        literalExpr(v)
      )
    ),
    false
  );
}

/** One operation's OperationDescriptor as plain data (only non-default fields present). */
function descriptorValue(
  op: OperationModel,
  schemes: SecuritySchemeModel[],
  dateType: DateType,
  pagination?: ModelPagination
) {
  const params = [...op.pathParams, ...op.queryParams, ...op.headerParams].map((p) => ({
    name: p.name,
    in: p.in,
    ...(p.style !== undefined ? { style: p.style } : {}),
    ...(p.explode !== undefined ? { explode: p.explode } : {}),
    ...(p.allowReserved !== undefined ? { allowReserved: p.allowReserved } : {}),
  }));
  const security = op.security.flatMap((key): SecuritySpec[] => {
    const s = schemes.find((scheme) => scheme.key === key);
    if (!s) return [];
    if (s.kind === 'bearer' || s.kind === 'basic') return [{ scheme: key, kind: s.kind }];
    if (s.kind === 'apiKeyHeader') {
      return [{ scheme: key, kind: 'apiKey', name: s.headerName, in: 'header' }];
    }
    if (s.kind === 'apiKeyQuery') {
      return [{ scheme: key, kind: 'apiKey', name: s.paramName, in: 'query' }];
    }
    return [{ scheme: key, kind: 'apiKey', name: s.cookieName, in: 'cookie' }];
  });
  const sse = isSseOp(op);
  const responseKind = sse ? 'sse' : computeResponse(op.successResponses, dateType).responseKind;
  return {
    // The spec's operationId, NOT the (possibly renamed) map key: `id` drives middleware
    // targeting (`ctx.operation.id`) and must match inline mode's `operationMetaExpr`.
    id: op.name,
    method: op.method.toUpperCase(),
    path: op.path,
    ...(op.tags.length > 0 ? { tags: op.tags } : {}),
    ...(params.length > 0 ? { params } : {}),
    ...(op.requestBody
      ? {
          body: {
            contentType: op.requestBody.contentType,
            ...(isTypedMultipart(op.requestBody) ? { multipart: true } : {}),
          },
        }
      : {}),
    ...(responseKind !== 'json' ? { responseKind } : {}),
    ...(sse ? { sseDataKind: sseDataKind(op) } : {}),
    ...(security.length > 0 ? { security } : {}),
    // The resolved spec is already normalized with stable key order (see pagination.ts).
    ...(pagination?.has(op.name) ? { pagination: pagination.get(op.name)!.spec } : {}),
  };
}

/** `export const OPERATIONS = {…} as const satisfies Record<string, OperationDescriptor>;` + unions. */
export function descriptorStatements(
  model: ApiModel,
  idents: Map<string, string>,
  dateType: DateType,
  pagination?: ModelPagination
): ts.Statement[] {
  const ops = allOperations(model.services);
  if (ops.length === 0) return [];
  const entries = ops.map((op) =>
    factory.createPropertyAssignment(
      idents.get(op.name)!,
      literalExpr(descriptorValue(op, model.securitySchemes, dateType, pagination))
    )
  );
  const operations = jsdoc(
    factory.createVariableStatement(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      factory.createVariableDeclarationList(
        [
          factory.createVariableDeclaration(
            'OPERATIONS',
            undefined,
            undefined,
            factory.createSatisfiesExpression(
              factory.createAsExpression(
                factory.createObjectLiteralExpression(entries, true),
                factory.createTypeReferenceNode('const')
              ),
              factory.createTypeReferenceNode('Record', [
                factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
                factory.createTypeReferenceNode('OperationDescriptor'),
              ])
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    'The wire-shape descriptor for every operation, keyed by operationId — the data the\n' +
      'runtime routes requests by. Also minification-safe static metadata (method, path,\n' +
      'tags) for cache keys, tracing span names, and request logging.'
  );
  // `tags` is present only on tagged entries, so `OperationTag` is derived via `Extract`
  // (a plain `["tags"]` index would not compile against the untagged entries), and is
  // omitted entirely when no operation has a tag (it would be `never`).
  const hasTags = ops.some((op) => op.tags.length > 0);
  const derived = parseStatements(
    'export type OperationId = keyof typeof OPERATIONS;\n' +
      'export type OperationPath = (typeof OPERATIONS)[OperationId]["path"];' +
      (hasTags
        ? '\nexport type OperationTag = Extract<(typeof OPERATIONS)[OperationId], { tags: readonly string[] }>["tags"][number];'
        : '')
  );
  return [operations, ...derived];
}

/**
 * `export type Ops = { <ident>: { args: …; result: …; kind?: "sse" } }` — the type map
 * `createClient<Ops>` consumes. A type alias (not an interface) on purpose: aliases get
 * an implicit index signature, so `Ops` satisfies the runtime's `OpsShape` constraint;
 * an interface would need an explicit `[key: string]` member.
 */
export function opsInterfaceStatements(
  model: ApiModel,
  idents: Map<string, string>,
  ctx: EmitContext
): ts.Statement[] {
  const ops = allOperations(model.services);
  if (ops.length === 0) return [];
  return [
    jsdoc(
      factory.createTypeAliasDeclaration(
        [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
        'Ops',
        undefined,
        factory.createTypeLiteralNode(ops.map((op) => opsMember(op, idents.get(op.name)!, ctx)))
      ),
      "Per-operation `args`/`result` shapes (plus `kind: 'sse'` for event streams) — the\n" +
        'type-level companion of `OPERATIONS` that gives `createClient<Ops>` its typed methods.'
    ),
  ];
}

/** One `<ident>: { args; result; kind? }` member of the `Ops` type. */
function opsMember(op: OperationModel, ident: string, ctx: EmitContext): ts.PropertySignature {
  const { pathParams } = operationSignature(op);
  // Path params are keyed by WIRE name — the runtime routes `args[param.name]`.
  const args = variablesTypeLiteral(
    op,
    pascalCase(op.name),
    pathParams.map((p) => p.param),
    new Map(pathParams.map((p) => [p.param.name, p.ident])),
    ctx,
    'wire'
  );
  const members = [
    factory.createPropertySignature(undefined, 'args', undefined, args),
    factory.createPropertySignature(undefined, 'result', undefined, resultType(op, ctx)),
  ];
  // Paginated operations declare the page's element type — it drives the runtime's
  // `.pages()`/`.items()` members on the method (`Client<Ops>` keys off `item`).
  const paginated = ctx.pagination?.get(op.name);
  if (paginated) {
    members.push(
      factory.createPropertySignature(
        undefined,
        'item',
        undefined,
        schemaToTypeNode(paginated.itemSchema, ctx.dateType)
      )
    );
    // Result mode wraps `result` in the envelope, but iteration unwraps it — `page`
    // carries the RAW page type `.pages()` yields. Throw mode emits no `page` member
    // (`Client<Ops>`'s pages-generator falls back to `result`, already the raw page).
    if (ctx.errorMode === 'result') {
      members.push(
        factory.createPropertySignature(undefined, 'page', undefined, rawResultRef(op, ctx))
      );
    }
  }
  if (isSseOp(op)) {
    members.push(
      factory.createPropertySignature(
        undefined,
        'kind',
        undefined,
        factory.createLiteralTypeNode(factory.createStringLiteral('sse'))
      )
    );
  }
  return factory.createPropertySignature(
    undefined,
    ident,
    undefined,
    factory.createTypeLiteralNode(members)
  );
}

/**
 * The raw success-response reference — the same suppression rule as
 * renderOperationParts: the emitted `<Op>Result` alias, or the inline response type
 * when that name collides with a schema.
 */
function rawResultRef(op: OperationModel, ctx: EmitContext): ts.TypeNode {
  const { responseType } = computeResponse(op.successResponses, ctx.dateType);
  const resultName = `${pascalCase(op.name)}Result`;
  return ctx.schemaNames.has(resultName)
    ? responseType
    : factory.createTypeReferenceNode(resultName);
}

/** The `result` slot: SSE event payload, or the response type — `Result`-wrapped in result mode. */
function resultType(op: OperationModel, ctx: EmitContext): ts.TypeNode {
  if (isSseOp(op)) return sseEventType(op, ctx.dateType);
  const resultRef = rawResultRef(op, ctx);
  if (ctx.errorMode !== 'result') return resultRef;
  return factory.createTypeReferenceNode('Result', [resultRef, errorTypeArg(op, ctx)]);
}

/**
 * The `Result<…, E>` error argument — the same composition `renderOperationParts` uses for
 * `__requestResult<R, E>`: `unknown` when the operation declares no error responses, the
 * emitted `<Op>Error` alias otherwise, or the inline (union of) error type(s) when that
 * alias name collides with a schema and is suppressed.
 */
function errorTypeArg(op: OperationModel, ctx: EmitContext): ts.TypeNode {
  const errorMembers = errorTypeNodes(op.errorResponses, ctx.dateType);
  if (errorMembers.length === 0) {
    return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
  }
  const errorAlias = `${pascalCase(op.name)}Error`;
  if (!ctx.schemaNames.has(errorAlias)) return factory.createTypeReferenceNode(errorAlias);
  return errorMembers.length === 1 ? errorMembers[0] : factory.createUnionTypeNode(errorMembers);
}
