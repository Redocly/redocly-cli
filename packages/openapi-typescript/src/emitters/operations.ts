import type { OperationModel, ParamModel } from '../ir/model.js';
import { safeIdent } from './identifier.js';
import { renderOperationAliases, sseAliases, variablesTypeLiteral } from './operation-aliases.js';
import { operationSignature } from './operation-signature.js';
import {
  bodyTypeNode,
  computeResponse,
  errorTypeNodes,
  isTypedMultipart,
  propertyKey,
  renderParamsObjectArg,
  simpleParam,
} from './operation-types.js';
import { isSseOp, partitionOps, sseDataKind, sseEventType } from './sse.js';
import { pascalCase, splitLines } from './support.js';
import { jsdoc, printStatements, ts } from './ts.js';
import { type DateType, schemaToTypeNode } from './types.js';

// `isTypedMultipart` lives in operation-types now; re-export it so existing importers
// (client.ts) keep resolving it from operations.ts.
export { isTypedMultipart };

const { factory } = ts;

/**
 * The developer-facing API shape emitted for the operations.
 * - `'functions'` (default): standalone `export async function`s.
 * - `'service-class'`: the operations grouped as methods of a class.
 */
export type Facade = 'functions' | 'service-class';

/** Error-handling shape of the generated client: throw on non-2xx, or return a result union. */
export type ErrorMode = 'throw' | 'result';

/**
 * How an operation's inputs are passed to the generated function/method.
 * - `'flat'` (default): path params spread as positional args, then the
 *   `params`/`body`/`headers` slots.
 * - `'grouped'`: a single `args: <Op>Variables` object bundling every input
 *   (path params, `params`, `body`, `headers`). The per-call `init:
 *   RequestOptions` stays a separate trailing argument in both styles.
 */
export type ArgsStyle = 'flat' | 'grouped';

/**
 * Emit `OPERATIONS`: a static map from operationId to the operation's HTTP
 * `method` and `path` template (with `{param}` placeholders intact), plus the
 * `OperationId` / `OperationMetadata` types.
 *
 * This is the one stable, runtime-readable handle on an operation's identity that
 * survives bundling and minification — function and method names can be mangled,
 * but these string literals cannot. Consumers use it to build cache/query keys,
 * tracing span names, and logging labels without re-deriving them from each call
 * site (and without fragile `fn.toString()` parsing).
 *
 * Facade- and output-mode-independent: the same map is emitted for both facades
 * and lives in the shared schemas module in multi-file layouts. Returns `''` when
 * the document declares no operations.
 */
export function renderOperationsMeta(ops: OperationModel[]): string {
  return printStatements(operationsMetaStatements(ops));
}

/** The `OPERATIONS` map + `OperationId`/`OperationMetadata` types as nodes (empty when no ops). */
export function operationsMetaStatements(ops: OperationModel[]): ts.Statement[] {
  if (ops.length === 0) return [];

  const entries = ops.map((op) =>
    factory.createPropertyAssignment(
      propertyKey(safeIdent(op.name)),
      factory.createObjectLiteralExpression(
        [
          factory.createPropertyAssignment(
            'method',
            factory.createStringLiteral(op.method.toUpperCase())
          ),
          factory.createPropertyAssignment('path', factory.createStringLiteral(op.path)),
        ],
        false
      )
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
            factory.createAsExpression(
              factory.createObjectLiteralExpression(entries, true),
              factory.createTypeReferenceNode('const')
            )
          ),
        ],
        ts.NodeFlags.Const
      )
    ),
    'Static metadata for every operation, keyed by operationId: the HTTP `method`\n' +
      'and the `path` template (with `{param}` placeholders intact). Minification-safe\n' +
      '— useful for building cache/query keys, tracing span names, and request logging\n' +
      'without re-deriving them at each call site.'
  );

  const operationId = jsdoc(
    factory.createTypeAliasDeclaration(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      'OperationId',
      undefined,
      factory.createTypeOperatorNode(
        ts.SyntaxKind.KeyOfKeyword,
        factory.createTypeQueryNode(factory.createIdentifier('OPERATIONS'))
      )
    ),
    'The operationId of any operation in this client.'
  );

  const operationMetadata = jsdoc(
    factory.createTypeAliasDeclaration(
      [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      'OperationMetadata',
      undefined,
      factory.createTypeLiteralNode([readonlyStringProp('method'), readonlyStringProp('path')])
    ),
    'Static metadata describing one operation: its HTTP method and path template.'
  );

  return [operations, operationId, operationMetadata];
}

/** A `readonly <name>: string` property signature for the `OperationMetadata` type. */
function readonlyStringProp(name: string): ts.PropertySignature {
  return factory.createPropertySignature(
    [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
    name,
    undefined,
    factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)
  );
}

/**
 * Render a block of operations in the chosen facade shape. This is the facade
 * seam: the `functions` adapter emits standalone `export async function`s; the
 * `service-class` adapter groups the same operations as methods of `className`.
 * Both reuse the identical runtime — only the developer-facing wrapper differs.
 */
export type OperationsBlockOptions = {
  facade: Facade;
  className: string;
  argsStyle?: ArgsStyle;
  errorMode?: 'throw' | 'result';
  /**
   * How `date-time`/`date` string fields are typed in param/body/response types.
   * Defaults to `'string'`; `'Date'` keeps operation types in sync with the schemas.
   */
  dateType?: DateType;
  /** Security-scheme keys whose credential is sent as a URL query param. */
  queryAuthKeys?: Set<string>;
  /**
   * Names of every exported schema. A `<Op>Result` alias whose name is in this set is
   * suppressed (the underlying response type is used inline instead) so it can't collide
   * with the schema's `export type` — a duplicate-identifier compile error otherwise.
   */
  schemaNames?: Set<string>;
  /**
   * The exported aggregate name bundling this block's SSE async generators
   * (functions facade). Defaults to `'sse'`; multi-file modes override it to keep
   * per-tag SSE bundles from colliding.
   */
  sseExportName?: string;
};

/**
 * The block-wide emit configuration every operation in a block shares. Bundling it
 * into one value keeps it out of the positional parameter lists of the operation
 * emitters (which would otherwise thread the same five arguments through every layer,
 * inviting transposition bugs). Per-call structural data (response type, ordered path
 * params, …) stays an explicit argument; only this cross-cutting config travels as `ctx`.
 */
export type EmitContext = {
  argsStyle: ArgsStyle;
  errorMode: 'throw' | 'result';
  dateType: DateType;
  /** Security-scheme keys whose credential is sent as a URL query param. */
  queryAuthKeys: Set<string>;
  /** Names of every exported schema, used for `<Op>*` alias collision suppression. */
  schemaNames: Set<string>;
};

export function renderOperationsBlock(
  ops: OperationModel[],
  options: OperationsBlockOptions
): string {
  return printStatements(operationsBlockStatements(ops, options));
}

/** A block of operations (functions or a service class) as nodes. */
export function operationsBlockStatements(
  ops: OperationModel[],
  options: OperationsBlockOptions
): ts.Statement[] {
  const ctx: EmitContext = {
    argsStyle: options.argsStyle ?? 'flat',
    errorMode: options.errorMode ?? 'throw',
    dateType: options.dateType ?? 'string',
    queryAuthKeys: options.queryAuthKeys ?? new Set<string>(),
    schemaNames: options.schemaNames ?? new Set<string>(),
  };
  const sseExportName = options.sseExportName ?? 'sse';
  if (options.facade === 'service-class')
    return serviceClassStatements(ops, options.className, ctx);

  const { regular, sse } = partitionOps(ops);
  const nodes: ts.Statement[] = [];
  for (const op of regular) {
    const { aliases, fn } = renderFunction(op, ctx);
    nodes.push(...aliases, fn);
  }
  // SSE ops are module-private async generators reached through the `sse`
  // aggregate (a stable namespace that survives output-mode partitioning),
  // never exported individually.
  for (const op of sse) {
    const { aliases, fn } = renderSseFunction(op, ctx);
    nodes.push(...aliases, fn);
  }
  if (sse.length > 0) nodes.push(sseAggregate(sseExportName, sse));
  return nodes;
}

/** Functions facade: a module-private `async function* <op>` for an SSE operation. */
function renderSseFunction(
  op: OperationModel,
  ctx: EmitContext
): { aliases: ts.Statement[]; fn: ts.FunctionDeclaration } {
  const parts = renderOperationParts(op, '__config', ctx);
  const fn = withDoc(
    factory.createFunctionDeclaration(
      [factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
      factory.createToken(ts.SyntaxKind.AsteriskToken),
      op.name,
      undefined,
      parts.params,
      parts.returnType,
      factory.createBlock(parts.body, true)
    ),
    parts.doc
  );
  return { aliases: parts.aliases, fn };
}

/** `export const <name> = { <op>, … };` — the namespace bundling a block's SSE generators. */
function sseAggregate(name: string, sse: OperationModel[]): ts.Statement {
  return factory.createVariableStatement(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          name,
          undefined,
          undefined,
          factory.createObjectLiteralExpression(
            sse.map((op) => factory.createShorthandPropertyAssignment(op.name)),
            false
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

/**
 * The conventional class name for a tag's service in `tags`/`tags-split` modes.
 * Tag stems can contain `-`/`_`/spaces, so each segment is PascalCased and joined
 * into a valid identifier; a leading digit is prefixed with `_`.
 */
export function serviceClassName(label: string): string {
  const pascal = label
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment[0].toUpperCase() + segment.slice(1))
    .join('');
  const name = `${pascal || 'Default'}Service`;
  return /^[0-9]/.test(name) ? `_${name}` : name;
}

/** Functions facade: one standalone `export async function` per operation. */
function renderFunction(
  op: OperationModel,
  ctx: EmitContext
): { aliases: ts.Statement[]; fn: ts.FunctionDeclaration } {
  const parts = renderOperationParts(op, '__config', ctx);
  const fn = withDoc(
    factory.createFunctionDeclaration(
      [
        factory.createModifier(ts.SyntaxKind.ExportKeyword),
        factory.createModifier(ts.SyntaxKind.AsyncKeyword),
      ],
      undefined,
      op.name,
      undefined,
      parts.params,
      parts.returnType,
      factory.createBlock(parts.body, true)
    ),
    parts.doc
  );
  return { aliases: parts.aliases, fn };
}

/**
 * `use(...middleware): this` — appends interceptors to this instance's
 * `config.middleware`, mirroring the functions facade's `use()`. Returns `this`
 * for chaining. Reassigns (rather than pushes) so a caller-provided `middleware`
 * array isn't mutated and can't leak across instances. (`config` is `readonly`,
 * but reassigning its `middleware` field — not `config` itself — is allowed.)
 */
function serviceUseMethod(): ts.ClassElement {
  // this.config.middleware = [...(this.config.middleware ?? []), ...middleware];
  const target = factory.createPropertyAccessExpression(
    factory.createPropertyAccessExpression(factory.createThis(), 'config'),
    'middleware'
  );
  const assign = factory.createExpressionStatement(
    factory.createAssignment(
      target,
      factory.createArrayLiteralExpression(
        [
          factory.createSpreadElement(
            factory.createBinaryExpression(
              target,
              factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
              factory.createArrayLiteralExpression([], false)
            )
          ),
          factory.createSpreadElement(factory.createIdentifier('middleware')),
        ],
        false
      )
    )
  );
  return jsdoc(
    factory.createMethodDeclaration(
      undefined,
      undefined,
      'use',
      undefined,
      undefined,
      [
        factory.createParameterDeclaration(
          undefined,
          factory.createToken(ts.SyntaxKind.DotDotDotToken),
          'middleware',
          undefined,
          factory.createArrayTypeNode(factory.createTypeReferenceNode('Middleware'))
        ),
      ],
      factory.createThisTypeNode(),
      factory.createBlock([assign, factory.createReturnStatement(factory.createThis())], true)
    ),
    'Register interceptors on this instance (see `ClientConfig.middleware`). Returns `this`.'
  );
}

/**
 * Service-class facade: one class named `className` whose methods are `ops`.
 * Operation type aliases (`<Op>Result`, …) can't live inside a class body, so
 * they're hoisted to module level ahead of the class; each method is the same
 * signature + body as the function form.
 *
 * The class takes an optional `ClientConfig` and stores it; methods thread
 * `this.config` to the runtime, so each instance is independently configured.
 * With no config it falls back to the global `BASE` + auth (back-compat).
 */
function serviceClassStatements(
  ops: OperationModel[],
  className: string,
  ctx: EmitContext
): ts.Statement[] {
  const aliases: ts.Statement[] = [];
  const members: ts.ClassElement[] = [
    factory.createConstructorDeclaration(
      undefined,
      [
        factory.createParameterDeclaration(
          [
            factory.createModifier(ts.SyntaxKind.PrivateKeyword),
            factory.createModifier(ts.SyntaxKind.ReadonlyKeyword),
          ],
          undefined,
          'config',
          undefined,
          factory.createTypeReferenceNode('ClientConfig'),
          factory.createObjectLiteralExpression([], false)
        ),
      ],
      factory.createBlock([], false)
    ),
    serviceUseMethod(),
  ];

  const { regular, sse } = partitionOps(ops);
  for (const op of regular) {
    const parts = renderOperationParts(op, 'this.config', ctx);
    aliases.push(...parts.aliases);
    members.push(
      withDoc(
        factory.createMethodDeclaration(
          [factory.createModifier(ts.SyntaxKind.AsyncKeyword)],
          undefined,
          op.name,
          undefined,
          undefined,
          parts.params,
          parts.returnType,
          factory.createBlock(parts.body, true)
        ),
        parts.doc
      )
    );
  }

  // SSE ops are private async generators, reached through the `readonly sse`
  // field of bound generators below — the public, namespace-style handle.
  for (const op of sse) {
    const parts = renderOperationParts(op, 'this.config', ctx);
    aliases.push(...parts.aliases);
    members.push(
      withDoc(
        factory.createMethodDeclaration(
          [
            factory.createModifier(ts.SyntaxKind.PrivateKeyword),
            factory.createModifier(ts.SyntaxKind.AsyncKeyword),
          ],
          factory.createToken(ts.SyntaxKind.AsteriskToken),
          op.name,
          undefined,
          undefined,
          parts.params,
          parts.returnType,
          factory.createBlock(parts.body, true)
        ),
        parts.doc
      )
    );
  }
  if (sse.length > 0) members.push(sseFieldDeclaration(sse));

  const cls = factory.createClassDeclaration(
    [factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    className,
    undefined,
    undefined,
    members
  );

  return [...aliases, cls];
}

/**
 * `readonly sse = { <op>: this.<op>.bind(this), … };` — the namespace field
 * exposing a class's private SSE generators, each `this`-bound so callers can
 * destructure them off the instance without losing their receiver.
 */
function sseFieldDeclaration(sse: OperationModel[]): ts.ClassElement {
  return factory.createPropertyDeclaration(
    [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)],
    'sse',
    undefined,
    undefined,
    factory.createObjectLiteralExpression(
      sse.map((op) =>
        factory.createPropertyAssignment(
          op.name,
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createPropertyAccessExpression(factory.createThis(), op.name),
              'bind'
            ),
            undefined,
            [factory.createThis()]
          )
        )
      ),
      false
    )
  );
}

/**
 * Decompose an operation into the parts both facades assemble: the module-level
 * type `aliases`, the `doc` comment text, the `params` list, the `returnType`,
 * and the `body` statements (`return __request<R>(…)`, possibly preceded by the
 * `const __a = await __auth(...)` auth prefix).
 *
 * `configRef` is the `ClientConfig` expression each request threads: the functions
 * facade passes the global `__config`; service-class methods pass `this.config`.
 */
function renderOperationParts(
  op: OperationModel,
  configRef: string,
  ctx: EmitContext
): {
  aliases: ts.Statement[];
  doc: string | undefined;
  params: ts.ParameterDeclaration[];
  returnType: ts.TypeNode;
  body: ts.Statement[];
} {
  const { argsStyle, errorMode, dateType, queryAuthKeys, schemaNames } = ctx;
  const groupedMode = argsStyle === 'grouped';
  const result = errorMode === 'result';
  const authed = op.security.length > 0;
  const hasQueryAuth = authed && op.security.some((k) => queryAuthKeys.has(k));
  const { orderedPathParams, pathParamIdent } = orderPathParams(op);
  const { responseType, responseKind } = computeResponse(op.successResponses, dateType);

  const params = renderArgList(op, orderedPathParams, pathParamIdent, ctx);
  const urlExpr = renderUrlExpr(op, configRef, groupedMode, pathParamIdent, hasQueryAuth);
  const initExpr = renderInitExpr(op, groupedMode, authed);
  const requestArgs = renderRequestArgs(
    op,
    configRef,
    urlExpr,
    initExpr,
    groupedMode,
    responseKind
  );

  // In result mode the operation returns `Result<<Op>Result, <Op>Error | unknown>`
  // and calls `__requestResult`. The `*Error` alias is emitted only when the
  // operation declares error responses; otherwise the error is `unknown` inline.
  const errorMembers = result ? errorTypeNodes(op.errorResponses, dateType) : [];
  const errorAlias = errorMembers.length > 0 ? `${pascalCase(op.name)}Error` : '';
  // Like `<Op>Result`, suppress the `<Op>Error` alias when its name collides with a schema
  // (`renderOperationAliases` skips it); the `Result<…>` error arg then references the inline
  // error type rather than the absent alias.
  const errorTypeArg: ts.TypeNode =
    errorMembers.length === 0
      ? factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword)
      : schemaNames.has(errorAlias)
        ? errorMembers.length === 1
          ? errorMembers[0]
          : factory.createUnionTypeNode(errorMembers)
        : factory.createTypeReferenceNode(errorAlias);

  const aliases = renderOperationAliases(
    op,
    responseType,
    orderedPathParams,
    pathParamIdent,
    errorAlias,
    errorMembers,
    ctx
  );

  // Authed ops resolve their (possibly async) credentials once, up front, then
  // spread `__a.headers` / merge `__a.query` at the call site.
  const body: ts.Statement[] = [];
  if (authed) body.push(authPrefixStatement(op.security, configRef));

  // SSE ops are async generators: instead of `return __request(...)` they
  // `yield* __sse<Event>(config, url, init, dataKind)`, and expose
  // `AsyncGenerator<ServerSentEvent<Event>>` (no `*Result` alias).
  if (isSseOp(op)) {
    const eventType = sseEventType(op, dateType);
    const returnType = factory.createTypeReferenceNode('AsyncGenerator', [
      factory.createTypeReferenceNode('ServerSentEvent', [eventType]),
    ]);
    body.push(
      factory.createExpressionStatement(
        factory.createYieldExpression(
          factory.createToken(ts.SyntaxKind.AsteriskToken),
          factory.createCallExpression(
            factory.createIdentifier('__sse'),
            [eventType],
            [configExpr(configRef), urlExpr, initExpr, factory.createStringLiteral(sseDataKind(op))]
          )
        )
      )
    );
    return {
      aliases: sseAliases(op, orderedPathParams, pathParamIdent, ctx),
      doc: renderOperationDoc(op),
      params,
      returnType,
      body,
    };
  }

  const resultName = `${pascalCase(op.name)}Result`;
  // When `<Op>Result` would collide with an exported schema, the alias is suppressed
  // (see `renderOperationAliases`), so reference the underlying response type directly
  // instead of the (now non-existent) alias — otherwise the name resolves to the schema.
  const resultRef = schemaNames.has(resultName)
    ? responseType
    : factory.createTypeReferenceNode(resultName);
  let returnType: ts.TypeNode;
  let call: ts.Expression;
  if (result) {
    returnType = factory.createTypeReferenceNode('Promise', [
      factory.createTypeReferenceNode('Result', [resultRef, errorTypeArg]),
    ]);
    call = factory.createCallExpression(
      factory.createIdentifier('__requestResult'),
      [resultRef, errorTypeArg],
      requestArgs
    );
  } else {
    returnType = factory.createTypeReferenceNode('Promise', [responseType]);
    call = factory.createCallExpression(
      factory.createIdentifier('__request'),
      [responseType],
      requestArgs
    );
  }
  body.push(factory.createReturnStatement(call));

  return { aliases, doc: renderOperationDoc(op), params, returnType, body };
}

/** `const __a = await __auth([...security], <config>);` — the up-front credential resolve. */
function authPrefixStatement(security: string[], configRef: string): ts.Statement {
  return factory.createVariableStatement(
    undefined,
    factory.createVariableDeclarationList(
      [
        factory.createVariableDeclaration(
          '__a',
          undefined,
          undefined,
          factory.createAwaitExpression(
            factory.createCallExpression(factory.createIdentifier('__auth'), undefined, [
              factory.createArrayLiteralExpression(
                security.map((k) => factory.createStringLiteral(k)),
                false
              ),
              configExpr(configRef),
            ])
          )
        ),
      ],
      ts.NodeFlags.Const
    )
  );
}

/**
 * Path params in URL-template order, each mapped to a safe, collision-free JS
 * identifier. Template names are matched liberally (`{pet-id}`, not `\w+`) since
 * OpenAPI names aren't constrained to identifiers; the safe ident serves as both
 * the function argument and the URL substitution (a parameter, unlike an object
 * key, cannot be quoted) and keys the `<Op>Variables` alias.
 */
function orderPathParams(op: OperationModel): {
  orderedPathParams: ParamModel[];
  pathParamIdent: Map<string, string>;
} {
  const { pathParams } = operationSignature(op);
  return {
    orderedPathParams: pathParams.map((p) => p.param),
    pathParamIdent: new Map(pathParams.map((p) => [p.param.name, p.ident])),
  };
}

/**
 * The function/method parameter list. `flat` spreads path params then the
 * `params`/`body`/`headers` slots; `grouped` bundles every input into one
 * `vars: <Op>Variables` (optional `= {}` only when every field is). Both modes end
 * with the trailing `init: RequestOptions`.
 */
function renderArgList(
  op: OperationModel,
  orderedPathParams: ParamModel[],
  pathParamIdent: Map<string, string>,
  ctx: EmitContext
): ts.ParameterDeclaration[] {
  const { dateType, schemaNames } = ctx;
  const groupedMode = ctx.argsStyle === 'grouped';
  const args: ts.ParameterDeclaration[] = [];
  if (groupedMode) {
    const sig = operationSignature(op);
    if (sig.hasInputs) {
      // Reference `<Op>Variables`, or inline its object type when that alias name collides
      // with a schema (the alias is then suppressed — see `renderOperationAliases`).
      const varsType = schemaNames.has(sig.variablesTypeName)
        ? variablesTypeLiteral(op, pascalCase(op.name), orderedPathParams, pathParamIdent, ctx)
        : factory.createTypeReferenceNode(sig.variablesTypeName);
      args.push(simpleParam('vars', varsType, !sig.varsRequired));
    }
  } else {
    for (const p of orderedPathParams) {
      args.push(
        simpleParam(pathParamIdent.get(p.name)!, schemaToTypeNode(p.schema, dateType), false)
      );
    }
    if (op.queryParams.length > 0)
      args.push(renderParamsObjectArg('params', op.queryParams, dateType));
    if (op.requestBody) {
      const type = bodyTypeNode(op.requestBody, dateType);
      args.push(
        factory.createParameterDeclaration(
          undefined,
          undefined,
          'body',
          op.requestBody.required ? undefined : factory.createToken(ts.SyntaxKind.QuestionToken),
          type
        )
      );
    }
    // Operation header params are explicit, typed inputs; security-scheme headers
    // are injected globally (in `renderInitExpr`) and live underneath them.
    if (op.headerParams.length > 0)
      args.push(renderParamsObjectArg('headers', op.headerParams, dateType));
  }
  // SSE ops take per-stream `SseOptions` (reconnect knobs); everyone else the
  // standard per-call `RequestOptions`.
  args.push(
    simpleParam(
      'init',
      factory.createTypeReferenceNode(isSseOp(op) ? 'SseOptions' : 'RequestOptions'),
      true
    )
  );
  return args;
}

/**
 * The `__buildUrl(config, \`/path\`, params?)` expression. Path params are
 * substituted via `encodeURIComponent`; a `{name}` with no matching declared param
 * is left literal (substituting it would reference an undeclared variable).
 */
function renderUrlExpr(
  op: OperationModel,
  configRef: string,
  groupedMode: boolean,
  pathParamIdent: Map<string, string>,
  hasQueryAuth: boolean
): ts.Expression {
  const pathExpr = pathTemplate(op.path, groupedMode, pathParamIdent);
  const args: ts.Expression[] = [configExpr(configRef), pathExpr];

  const queryRef = factory.createPropertyAccessExpression(
    groupedMode ? factory.createIdentifier('vars') : factory.createIdentifier('params'),
    'params'
  );
  const plainQueryRef = groupedMode ? queryRef : factory.createIdentifier('params');
  const authQuery = factory.createSpreadAssignment(
    factory.createPropertyAccessExpression(factory.createIdentifier('__a'), 'query')
  );

  if (op.queryParams.length === 0) {
    // Query-auth with no regular query params still needs to inject `__a.query`.
    if (hasQueryAuth) args.push(factory.createObjectLiteralExpression([authQuery], false));
  } else if (hasQueryAuth) {
    args.push(
      factory.createObjectLiteralExpression(
        [factory.createSpreadAssignment(plainQueryRef), authQuery],
        false
      )
    );
  } else {
    args.push(plainQueryRef);
  }

  // A 4th `styles` spec is emitted only for non-default query params, so
  // default operations stay byte-identical (no 4th arg, the runtime's default
  // serialization path runs). A styled query param is definitionally a query
  // param, so the 3rd (query) arg above is always present here.
  const styles = stylesLiteral(op.queryParams);
  if (styles) args.push(styles);

  return factory.createCallExpression(factory.createIdentifier('__buildUrl'), undefined, args);
}

/**
 * The per-param query-serialization `styles` object literal for `__buildUrl`,
 * containing entries ONLY for non-default params, or `undefined` when every
 * query param is at the OpenAPI default (`form` + `explode: true`).
 *
 * A param is non-default when ANY of: `style` is set and ≠ `form`, OR
 * `explode === false`, OR `allowReserved === true`. Keyed by the wire param
 * name (a StringLiteral, since names may contain non-identifier chars); the
 * value carries the resolved `style`/`explode` and `allowReserved` only when set.
 */
function stylesLiteral(queryParams: ParamModel[]): ts.ObjectLiteralExpression | undefined {
  const entries: ts.PropertyAssignment[] = [];
  for (const p of queryParams) {
    const styled = (p.style !== undefined && p.style !== 'form') || p.explode === false;
    if (!styled && !p.allowReserved) continue;
    const props: ts.PropertyAssignment[] = [
      factory.createPropertyAssignment('style', factory.createStringLiteral(p.style ?? 'form')),
      factory.createPropertyAssignment(
        'explode',
        (p.explode ?? true) ? factory.createTrue() : factory.createFalse()
      ),
    ];
    if (p.allowReserved)
      props.push(factory.createPropertyAssignment('allowReserved', factory.createTrue()));
    entries.push(
      factory.createPropertyAssignment(
        factory.createStringLiteral(p.name),
        factory.createObjectLiteralExpression(props, false)
      )
    );
  }
  return entries.length > 0 ? factory.createObjectLiteralExpression(entries, false) : undefined;
}

/**
 * The path template literal with `{name}` placeholders substituted by
 * `${encodeURIComponent(String(<ident>))}`. A placeholder with no declared param
 * is left literal. No placeholders ⇒ a no-substitution template literal.
 */
function pathTemplate(
  path: string,
  groupedMode: boolean,
  pathParamIdent: Map<string, string>
): ts.TemplateLiteral {
  // Split the path on declared `{name}` placeholders into literal chunks and
  // substitution expressions. An undeclared placeholder stays in the literal text.
  const literals: string[] = [];
  const exprs: ts.Expression[] = [];
  let buffer = '';
  let last = 0;
  for (const match of path.matchAll(/\{([^}]+)\}/g)) {
    const ident = pathParamIdent.get(match[1]);
    if (!ident) continue;
    buffer += path.slice(last, match.index);
    literals.push(buffer);
    buffer = '';
    last = match.index! + match[0].length;
    const ref = groupedMode
      ? factory.createPropertyAccessExpression(factory.createIdentifier('vars'), ident)
      : factory.createIdentifier(ident);
    exprs.push(
      factory.createCallExpression(factory.createIdentifier('encodeURIComponent'), undefined, [
        factory.createCallExpression(factory.createIdentifier('String'), undefined, [ref]),
      ])
    );
  }
  buffer += path.slice(last);

  if (exprs.length === 0) return factory.createNoSubstitutionTemplateLiteral(buffer);

  const head = factory.createTemplateHead(literals[0]);
  const spans = exprs.map((expr, i) =>
    factory.createTemplateSpan(
      expr,
      i === exprs.length - 1
        ? factory.createTemplateTail(buffer)
        : factory.createTemplateMiddle(literals[i + 1])
    )
  );
  return factory.createTemplateExpression(head, spans);
}

/**
 * The `RequestInit` literal: method + caller `init`, plus a merged `headers`
 * object when the operation injects auth or declares header params. Header
 * precedence, lowest → highest (later spreads win): injected auth (`__a.headers`,
 * resolved by the up-front `const __a = await __auth(...)`) → explicit
 * header-param values → caller `init.headers`. So an explicit header overrides
 * auto-injected auth, and the caller always overrides both.
 */
function renderInitExpr(op: OperationModel, groupedMode: boolean, authed: boolean): ts.Expression {
  const method = op.method.toUpperCase();
  const baseProps: ts.ObjectLiteralElementLike[] = [
    factory.createPropertyAssignment('method', factory.createStringLiteral(method)),
    factory.createSpreadAssignment(factory.createIdentifier('init')),
  ];

  const headerSources: ts.ObjectLiteralElementLike[] = [];
  if (authed) {
    headerSources.push(
      factory.createSpreadAssignment(
        factory.createPropertyAccessExpression(factory.createIdentifier('__a'), 'headers')
      )
    );
  }
  if (op.headerParams.length > 0) {
    headerSources.push(factory.createSpreadAssignment(headersHelperCall(op, groupedMode)));
  }
  if (headerSources.length === 0) {
    return factory.createObjectLiteralExpression(baseProps, false);
  }
  // `...(init.headers as Record<string, string> | undefined)` — caller wins.
  headerSources.push(
    factory.createSpreadAssignment(
      factory.createAsExpression(
        factory.createPropertyAccessExpression(factory.createIdentifier('init'), 'headers'),
        factory.createUnionTypeNode([
          factory.createTypeReferenceNode('Record', [
            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
            factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ]),
          factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
        ])
      )
    )
  );
  return factory.createObjectLiteralExpression(
    [
      ...baseProps,
      factory.createPropertyAssignment(
        'headers',
        factory.createObjectLiteralExpression(headerSources, false)
      ),
    ],
    false
  );
}

/** `__headers(<headersRef>)` for the explicit header-param slot. */
function headersHelperCall(op: OperationModel, groupedMode: boolean): ts.Expression {
  // Optional headers may be absent on `vars`, so they fall back to `{}`.
  let headersRef: ts.Expression;
  if (groupedMode) {
    const varsHeaders = factory.createPropertyAccessExpression(
      factory.createIdentifier('vars'),
      'headers'
    );
    headersRef = op.headerParams.some((p) => p.required)
      ? varsHeaders
      : factory.createBinaryExpression(
          varsHeaders,
          factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
          factory.createObjectLiteralExpression([], false)
        );
  } else {
    headersRef = factory.createIdentifier('headers');
  }
  return factory.createCallExpression(factory.createIdentifier('__headers'), undefined, [
    headersRef,
  ]);
}

/**
 * The positional arguments to `__request<T>(…)`: config, url, init, then an
 * optional body and an explicit response-kind. A non-json response with no body
 * still passes `undefined` as the body placeholder so the kind lands in the right
 * position.
 */
function renderRequestArgs(
  op: OperationModel,
  configRef: string,
  urlExpr: ts.Expression,
  initExpr: ts.Expression,
  groupedMode: boolean,
  responseKind: 'json' | 'blob' | 'text' | 'void'
): ts.Expression[] {
  const args: ts.Expression[] = [configExpr(configRef), urlExpr, initExpr];
  if (op.requestBody) {
    const bodyExpr = groupedMode
      ? factory.createPropertyAccessExpression(factory.createIdentifier('vars'), 'body')
      : factory.createIdentifier('body');
    // A typed multipart body is a plain object; serialize it to FormData on the way out.
    args.push(
      isTypedMultipart(op.requestBody)
        ? factory.createCallExpression(factory.createIdentifier('__toFormData'), undefined, [
            bodyExpr,
          ])
        : bodyExpr
    );
  } else if (responseKind !== 'json') {
    args.push(factory.createIdentifier('undefined'));
  }
  if (responseKind !== 'json') args.push(factory.createStringLiteral(responseKind));
  return args;
}

/** The `ClientConfig` expression threaded into the runtime: `__config` or `this.config`. */
function configExpr(configRef: string): ts.Expression {
  return configRef === 'this.config'
    ? factory.createPropertyAccessExpression(factory.createThis(), 'config')
    : factory.createIdentifier(configRef);
}

/** The operation's JSDoc body: summary, then a blank line and the description. */
function renderOperationDoc(op: OperationModel): string | undefined {
  const docLines: string[] = [];
  if (op.summary) docLines.push(op.summary);
  if (op.description) {
    if (op.summary) docLines.push('');
    for (const line of splitLines(op.description)) docLines.push(line);
  }
  while (docLines.length > 0 && docLines[docLines.length - 1] === '') docLines.pop();
  return docLines.length > 0 ? docLines.join('\n') : undefined;
}

/** Attach an operation/param JSDoc block to a node, when there is one. */
function withDoc<T extends ts.Node>(node: T, doc: string | undefined): T {
  return doc === undefined ? node : jsdoc(node, doc);
}
