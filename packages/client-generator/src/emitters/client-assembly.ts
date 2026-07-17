// Client assembly, shared by both runtime distributions and both output modes. The
// wiring (descriptor map + `Ops` interface, emitters/descriptor.ts) is identical; only
// the runtime block differs — `runtime: 'package'` imports `createClient` from
// `@redocly/client-generator`, everything else (inline, the default) embeds the
// assembled runtime sources in its place (emitters/inline-runtime.ts). Single-file
// layout: runtime (import line | embedded block) → schema types → type guards →
// `<Op>*` aliases → Ops → OPERATIONS → (baked setup) → client instance → sugar →
// (package mode only) type re-exports — the embedded types are already exported in
// place, so the embed arm needs none. Split mode moves the schema types + guards into
// a sibling `<stem>.schemas.ts` the entry re-exports (`emitClientSplit`).

import {
  allOperations,
  type ApiModel,
  type OperationModel,
  type SecuritySchemeModel,
} from '../intermediate-representation/model.js';
import { apiKeySetterName } from './auth.js';
import { descriptorStatements, opsInterfaceStatements, packageIdents } from './descriptor.js';
import { banner, type EmitOptions, HEADER, renderTitleComment } from './emit-options.js';
import { isIdentifier } from './identifier.js';
import { assembleInlineRuntime } from './inline-runtime.js';
import { renderOperationAliases, sseAliases } from './operation-aliases.js';
import { operationSignature } from './operation-signature.js';
import { computeResponse, errorTypeNodes, isTypedMultipart } from './operation-types.js';
import { type EmitContext, renderArgList } from './operations.js';
import { resolveModelPagination } from './pagination.js';
import { isSseOp } from './sse.js';
import { pascalCase } from './support.js';
import {
  arrow,
  exportConstStatement,
  parseStatements,
  printNodes,
  printStatements,
  ts,
} from './ts.js';
import { typeGuardStatements } from './type-guards.js';
import { typesStatements } from './types.js';

const { factory } = ts;

const PACKAGE_SPECIFIER = '@redocly/client-generator';

/**
 * A double-quoted TS string literal for generated code. `JSON.stringify` alone leaves
 * U+2028/U+2029 raw (legal JSON, line terminators in code contexts) — escape them so a
 * hostile spec value can never alter the shape of the emitted statement.
 */
function codeString(value: string): string {
  return JSON.stringify(value)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function emitClientSingleFile(model: ApiModel, options: EmitOptions = {}): string {
  return emitClient(model, options).entry;
}

/**
 * `split` mode: the same client with the schema types + type guards carved out into a
 * sibling `<stem>.schemas.ts`. The entry file re-exports the schemas module
 * (`export *`) and type-imports exactly the schema names its own code references, so
 * both files hold under `noUnusedLocals`. `schemas` is absent when the document
 * declares no schema statements (the entry is then self-contained).
 */
export function emitClientSplit(
  model: ApiModel,
  options: EmitOptions,
  stem: string
): { entry: string; schemas?: string } {
  return emitClient(model, options, stem);
}

/** The shared assembly; `splitStem` (when given) selects the two-file split layout. */
function emitClient(
  model: ApiModel,
  options: EmitOptions,
  splitStem?: string
): { entry: string; schemas?: string } {
  const embed = options.runtime !== 'package';
  const ops = allOperations(model.services);
  const idents = packageIdents(model);
  // Resolved (and VERIFIED) up front: an explicit rule that doesn't fit throws here,
  // before any statement is built — one aggregated error for the whole model.
  const pagination = resolveModelPagination(model, options.pagination);
  const ctx: EmitContext = {
    argsStyle: options.argsStyle ?? 'flat',
    errorMode: options.errorMode ?? 'throw',
    dateType: options.dateType ?? 'string',
    schemaNames: new Set(model.schemas.map((s) => s.name)),
    pagination,
  };
  const flat = ctx.argsStyle === 'flat';
  const hasSse = ops.some(isSseOp);
  const hasRegular = ops.some((op) => !isSseOp(op));
  const apiKeySchemes = model.securitySchemes.filter(
    (s) => s.kind === 'apiKeyHeader' || s.kind === 'apiKeyQuery' || s.kind === 'apiKeyCookie'
  );

  const wiring =
    ops.length > 0
      ? [
          ...opsInterfaceStatements(model, idents, ctx),
          ...descriptorStatements(model, idents, ctx.dateType, pagination),
        ]
      : // A spec with no operations still gets the uniform wiring shape.
        parseStatements(
          'export type Ops = Record<string, never>;\n' +
            'export const OPERATIONS = {} as const satisfies Record<string, OperationDescriptor>;'
        );

  const runtimeSection = embed
    ? assembleInlineRuntime({
        multipart: ops.some((op) => op.requestBody && isTypedMultipart(op.requestBody)),
        // Auth sugar needs schemes; `resolveAuth` fires when a descriptor carries
        // `security` — a valid spec implies the former, but embed on either.
        auth: model.securitySchemes.length > 0 || ops.some((op) => op.security.length > 0),
        sse: hasSse,
        setup: !!options.setup,
        paginate: pagination.size > 0,
      })
    : importLine(options, ctx, {
        hasFlatSse: hasSse && flat,
        hasFlatRegular: hasRegular && flat,
        hasRegular,
        hasApiKey: apiKeySchemes.length > 0,
      });
  const schemaStatements = [
    ...typesStatements(model.schemas, options.enumStyle ?? 'const-object', ctx.dateType),
    ...typeGuardStatements(model.schemas),
  ];
  const bodyStatements = [...ops.flatMap((op) => aliasStatements(op, ctx)), ...wiring];
  const sugar = printNodes(sugarStatements(ops, idents, ctx, model.securitySchemes, apiKeySchemes));
  // Embed mode exports its whole public surface in place; only the package arm re-exports.
  const reexports = embed ? '' : reexportLines(ctx, hasSse);

  // Layout puts the reader's OWN API first (types → aliases → Ops → OPERATIONS) and the
  // machinery after it. In embed mode the runtime block sits between the descriptors and
  // the `client` initializer — after it for readability, before `client` so every
  // declaration the module-init call chain touches (hoisted functions AND any future
  // top-level const) is already evaluated; in package mode the import line leads.
  if (splitStem === undefined) {
    return {
      entry: banner([
        HEADER,
        renderTitleComment(model),
        ...(embed ? [] : [runtimeSection]),
        printStatements([...schemaStatements, ...bodyStatements]),
        ...(embed ? [runtimeSection] : []),
        clientSection(options, ctx, model),
        sugar,
        reexports,
      ]),
    };
  }

  const body = printStatements(bodyStatements);
  const hasSchemas = schemaStatements.length > 0;
  return {
    entry: banner([
      HEADER,
      renderTitleComment(model),
      hasSchemas
        ? schemaLinks(body + '\n' + sugar, ctx.schemaNames, `./${splitStem}.schemas.js`)
        : '',
      ...(embed ? [] : [runtimeSection]),
      body,
      ...(embed ? [runtimeSection] : []),
      clientSection(options, ctx, model),
      sugar,
      reexports,
    ]),
    schemas: hasSchemas
      ? banner([HEADER, renderTitleComment(model), printStatements(schemaStatements)])
      : undefined,
  };
}

/**
 * The entry ⇄ schemas linkage of the split layout: a type-only import of exactly the
 * schema names the entry's own code references, plus the public `export *` re-export.
 * Referenced names are found by walking the printed entry code's identifiers (an AST
 * pass over the emitted text, not a substring search — operation JSDoc may mention a
 * schema name, and importing an unreferenced type would trip `noUnusedLocals`).
 */
function schemaLinks(entryCode: string, schemaNames: Set<string>, specifier: string): string {
  const referenced = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && schemaNames.has(node.text)) referenced.add(node.text);
    node.forEachChild(visit);
  };
  for (const statement of parseStatements(entryCode)) visit(statement);
  const names = [...referenced].sort();
  const importLine =
    names.length > 0 ? `import type { ${names.join(', ')} } from '${specifier}';\n` : '';
  return `${importLine}export * from '${specifier}';`;
}

/** The single import from the runtime package — only names the file actually references. */
function importLine(
  options: EmitOptions,
  ctx: EmitContext,
  refs: { hasFlatSse: boolean; hasFlatRegular: boolean; hasRegular: boolean; hasApiKey: boolean }
): string {
  const values = ['createClient', ...(options.setup ? ['mergeSetup'] : [])];
  const types = [
    ...(options.setup ? ['ClientConfig', 'Middleware'] : []),
    'OperationDescriptor',
    // Flat sugar signatures reference the per-call option types.
    ...(refs.hasFlatRegular ? ['RequestOptions'] : []),
    // `Ops` wraps results in `Result` in result mode — but only NON-SSE members
    // (an SSE-only spec would otherwise import it unused and fail noUnusedLocals).
    ...(ctx.errorMode === 'result' && refs.hasRegular ? ['Result'] : []),
    ...(refs.hasFlatSse ? ['SseOptions'] : []),
    // The apiKey sugar closures take a `TokenProvider`.
    ...(refs.hasApiKey ? ['TokenProvider'] : []),
  ].sort();
  const names = [...values, ...types.map((t) => `type ${t}`)].join(', ');
  return `import { ${names} } from '${PACKAGE_SPECIFIER}';`;
}

/** One operation's `<Op>*` aliases — the same emitters and suppression rules as inline mode. */
function aliasStatements(op: OperationModel, ctx: EmitContext): ts.Statement[] {
  const { pathParams } = operationSignature(op);
  const ordered = pathParams.map((p) => p.param);
  const identMap = new Map(pathParams.map((p) => [p.param.name, p.ident]));
  if (isSseOp(op)) return sseAliases(op, ordered, identMap, ctx, 'wire');
  const { responseType } = computeResponse(op.successResponses, ctx.dateType);
  const errorMembers =
    ctx.errorMode === 'result' ? errorTypeNodes(op.errorResponses, ctx.dateType) : [];
  const errorAlias = errorMembers.length > 0 ? `${pascalCase(op.name)}Error` : '';
  return renderOperationAliases(
    op,
    responseType,
    ordered,
    identMap,
    errorAlias,
    errorMembers,
    ctx,
    true,
    'wire'
  );
}

/** The (optional) baked setup + the default `client` instance. */
function clientSection(options: EmitOptions, ctx: EmitContext, model: ApiModel): string {
  const serverUrl = options.serverUrl ?? model.serverUrl;
  const fields = [
    // Always baked when the document declares one: the runtime's fallback is a
    // relative URL, which Node's fetch rejects.
    ...(serverUrl !== undefined ? [`serverUrl: ${codeString(serverUrl)}`] : []),
    ...(ctx.errorMode === 'result' ? ['errorMode: "result"'] : []),
  ];
  const config = fields.length > 0 ? `{ ${fields.join(', ')} }` : '{}';
  // Precedence, lowest → highest: spec defaults → baked publisher setup → app `configure()`.
  // The inner merge flattens the setup into a ClientConfig; the outer layers it OVER the
  // spec defaults (mergeSetup's second argument wins per-field; middleware composes).
  const configArg = options.setup
    ? `mergeSetup({ config: ${config} }, mergeSetup(__redoclySetup, {}))`
    : config;
  // The trailing type args narrow `ctx.operation` to the spec's literal unions.
  // `OperationTag` mirrors descriptorStatements' gate: derived only when some
  // operation is tagged (it would otherwise be `never`); zero-ops specs have no
  // derived unions at all, so they keep the string defaults.
  const ops = allOperations(model.services);
  const hasTags = ops.some((op) => op.tags.length > 0);
  const typeArgs =
    ops.length > 0
      ? `<Ops, OperationId, OperationPath, ${hasTags ? 'OperationTag' : 'string'}>`
      : '<Ops>';
  const client = `export const client = createClient${typeArgs}(OPERATIONS, ${configArg});`;
  if (!options.setup) return client;
  return (
    '// ─── Baked-in setup (--setup) ───\n' +
    `const __redoclySetup: { config?: ClientConfig; middleware?: Middleware[] } = ${options.setup};\n` +
    client
  );
}

/** Core destructure + per-scheme auth setters + per-operation call sugar. */
function sugarStatements(
  ops: OperationModel[],
  idents: Map<string, string>,
  ctx: EmitContext,
  schemes: SecuritySchemeModel[],
  apiKeySchemes: SecuritySchemeModel[]
): ts.Statement[] {
  const statements = [...parseStatements('export const { configure, use } = client;')];
  // Auth sugar in `authSetterNames` order: bearer, basic, then each apiKey scheme.
  // The runtime's auth members close over the instance config (no `this`), so
  // direct bindings are safe.
  if (schemes.some((s) => s.kind === 'bearer')) {
    statements.push(...parseStatements('export const setBearer = client.auth.bearer;'));
  }
  if (schemes.some((s) => s.kind === 'basic')) {
    statements.push(...parseStatements('export const setBasicAuth = client.auth.basic;'));
  }
  for (const scheme of apiKeySchemes) {
    const name = apiKeySetterName(scheme.key, apiKeySchemes.length === 1);
    statements.push(
      ...parseStatements(
        `export const ${name} = (value: TokenProvider) => client.auth.apiKey(${codeString(scheme.key)}, value);`
      )
    );
  }
  if (ops.length === 0) return statements;
  if (ctx.argsStyle === 'grouped') {
    // Grouped style: the client methods already take the grouped args shape.
    const names = ops.map((op) => idents.get(op.name)!).join(', ');
    statements.push(...parseStatements(`export const { ${names} } = client;`));
    return statements;
  }
  for (const op of ops) statements.push(flatSugarStatement(op, idents.get(op.name)!, ctx));
  return statements;
}

/**
 * One flat one-liner: today's positional signature forwarding to the grouped client
 * method. Path values are keyed by the WIRE name (the runtime routes
 * `args[param.name]`); a path param literally named `params`/`body`/`headers` would
 * collide with the slot keys — a spec-acknowledged runtime-contract limitation.
 * A paginated operation's arrow is wrapped in `Object.assign(…, { pages, items })`
 * so the flat sugar preserves the method-attached iterators.
 */
function flatSugarStatement(op: OperationModel, ident: string, ctx: EmitContext): ts.Statement {
  const { pathParams } = operationSignature(op);
  const params = renderArgList(
    op,
    pathParams.map((p) => p.param),
    new Map(pathParams.map((p) => [p.param.name, p.ident])),
    ctx
  );
  const props: ts.ObjectLiteralElementLike[] = pathParams.map(({ param, ident: paramIdent }) =>
    param.name === paramIdent
      ? factory.createShorthandPropertyAssignment(paramIdent)
      : factory.createPropertyAssignment(
          isIdentifier(param.name) ? param.name : factory.createStringLiteral(param.name),
          factory.createIdentifier(paramIdent)
        )
  );
  if (op.queryParams.length > 0) props.push(factory.createShorthandPropertyAssignment('params'));
  if (op.requestBody) props.push(factory.createShorthandPropertyAssignment('body'));
  if (op.headerParams.length > 0) {
    props.push(factory.createShorthandPropertyAssignment('headers'));
  }
  const call = factory.createCallExpression(
    factory.createPropertyAccessExpression(factory.createIdentifier('client'), ident),
    undefined,
    [factory.createObjectLiteralExpression(props, false), factory.createIdentifier('init')]
  );
  const fn = arrow(params, call);
  if (!ctx.pagination?.has(op.name)) return exportConstStatement(ident, fn);
  const methodMember = (name: string) =>
    factory.createPropertyAssignment(
      name,
      factory.createPropertyAccessExpression(
        factory.createPropertyAccessExpression(factory.createIdentifier('client'), ident),
        name
      )
    );
  return exportConstStatement(
    ident,
    factory.createCallExpression(
      factory.createPropertyAccessExpression(factory.createIdentifier('Object'), 'assign'),
      undefined,
      [
        fn,
        factory.createObjectLiteralExpression(
          [methodMember('pages'), methodMember('items')],
          false
        ),
      ]
    )
  );
}

/** Public type surface re-exported for single-import DX (plus the `ApiError` class). */
function reexportLines(ctx: EmitContext, hasSse: boolean): string {
  const types = [
    'ClientConfig',
    'Middleware',
    'RequestOptions',
    ...(ctx.errorMode === 'result' ? ['Result'] : []),
    ...(hasSse ? ['ServerSentEvent', 'SseOptions'] : []),
  ].sort();
  return (
    // `createClient` is re-exported so package-mode consumers can build additional
    // instances from the generated module alone — symmetric with inline output.
    `export { ApiError, createClient } from '${PACKAGE_SPECIFIER}';\n` +
    `export type { ${types.join(', ')} } from '${PACKAGE_SPECIFIER}';`
  );
}
