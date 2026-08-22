// Client assembly, shared by both runtime distributions and both output modes. The
// wiring (descriptor map + `Ops` interface) is identical; only the runtime block
// differs — `runtime: 'package'` imports `createClient` from
// `@redocly/client-generator`, everything else (inline, the default) embeds the
// assembled runtime sources in its place (emitters/inline-runtime.ts). Single-file
// layout: runtime (import line | embedded block) → schema types → type guards →
// `<Op>*` aliases → Ops → OPERATIONS → (baked setup) → client instance → sugar →
// (package mode only) type re-exports — the embedded types are already exported in
// place, so the embed arm needs none. Split mode moves the schema types + guards into
// a sibling `<stem>.schemas.ts` the entry re-exports (`emitClientSplit`).
// Text templates throughout — no `typescript` at generate time.

import {
  allOperations,
  type ApiModel,
  type OperationModel,
} from '../intermediate-representation/model.js';
import { packageIdents, renderDescriptors } from './descriptor.js';
import { banner, type EmitOptions, HEADER, renderTitleComment } from './emit-options.js';
import { codeString } from './identifier.js';
import { assembleInlineRuntime } from './inline-runtime.js';
import { isTypedMultipart } from './operation-types.js';
import type { EmitContext } from './operations.js';
import { collectEntrySchemaRefs, renderAliases, renderOpsType } from './render-client.js';
import { isSseOp } from './sse.js';
import { renderTypeAliases } from './ts-type.js';
import { renderTypeGuards } from './type-guards.js';

const PACKAGE_SPECIFIER = '@redocly/client-generator';

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
  const pagination = options.pagination ?? new Map();
  const ctx: EmitContext = {
    argsStyle: options.argsStyle ?? 'grouped',
    errorMode: options.errorMode ?? 'throw',
    dateType: options.dateType ?? 'string',
    schemaNames: new Set(model.schemas.map((s) => s.name)),
    schemas: model.schemas,
    pagination,
  };
  const hasSse = ops.some(isSseOp);
  const hasRegular = ops.some((op) => !isSseOp(op));

  const wiring =
    ops.length > 0
      ? [
          renderOpsType(model, idents, ctx),
          renderDescriptors(model, idents, ctx.dateType, pagination, ctx.argsStyle),
        ]
      : // A spec with no operations still gets the uniform wiring shape.
        [
          'export type Ops = Record<string, never>;',
          'export const OPERATIONS = {} as const satisfies Record<string, OperationDescriptor>;',
        ];

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
    : importLine(options, ctx, { hasRegular });
  const schemaSection = [
    renderTypeAliases(model.schemas, ctx.dateType),
    renderTypeGuards(model.schemas),
  ]
    .filter((section) => section.length > 0)
    .join('\n\n');
  const bodySection = [...ops.map((op) => renderAliases(op, ctx)), ...wiring]
    .filter((section) => section.length > 0)
    .join('\n\n');
  const sugar = sugarSection(ops, idents);
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
        [schemaSection, bodySection].filter((section) => section.length > 0).join('\n\n'),
        ...(embed ? [runtimeSection] : []),
        clientSection(options, ctx, model),
        sugar,
        reexports,
      ]),
    };
  }

  const hasSchemas = schemaSection.length > 0;
  return {
    entry: banner([
      HEADER,
      renderTitleComment(model),
      hasSchemas
        ? schemaLinks(model, ctx, `./${splitStem}.schemas.${options.importExt ?? 'js'}`)
        : '',
      ...(embed ? [] : [runtimeSection]),
      bodySection,
      ...(embed ? [runtimeSection] : []),
      clientSection(options, ctx, model),
      sugar,
      reexports,
    ]),
    schemas: hasSchemas ? banner([HEADER, renderTitleComment(model), schemaSection]) : undefined,
  };
}

/**
 * The entry ⇄ schemas linkage of the split layout: a type-only import of exactly the
 * schema names the entry's own code references (derived from the IR — the same
 * sources the alias/Ops renderers type), plus the public `export *` re-export.
 */
function schemaLinks(model: ApiModel, ctx: EmitContext, specifier: string): string {
  const names = collectEntrySchemaRefs(model, ctx);
  const importLine =
    names.length > 0 ? `import type { ${names.join(', ')} } from '${specifier}';\n` : '';
  return `${importLine}export * from '${specifier}';`;
}

/** The single import from the runtime package — only names the file actually references. */
function importLine(options: EmitOptions, ctx: EmitContext, refs: { hasRegular: boolean }): string {
  const values = ['createClient', ...(options.setup ? ['mergeSetup'] : [])];
  const types = [
    ...(options.setup ? ['ClientConfig', 'Middleware'] : []),
    'OperationDescriptor',
    // `Ops` wraps results in `Result` in result mode — but only NON-SSE members
    // (an SSE-only spec would otherwise import it unused and fail noUnusedLocals).
    ...(ctx.errorMode === 'result' && refs.hasRegular ? ['Result'] : []),
  ].sort();
  const names = [...values, ...types.map((t) => `type ${t}`)].join(', ');
  return `import { ${names} } from '${PACKAGE_SPECIFIER}';`;
}

/** The (optional) baked setup + the default `client` instance. */
function clientSection(options: EmitOptions, ctx: EmitContext, model: ApiModel): string {
  const serverUrl = options.serverUrl ?? model.serverUrl;
  const fields = [
    // Always baked when the document declares one: the runtime's fallback is a
    // relative URL, which Node's fetch rejects.
    ...(serverUrl !== undefined ? [`serverUrl: ${codeString(serverUrl)}`] : []),
    ...(ctx.errorMode === 'result' ? ['errorMode: "result"'] : []),
    // The runtime converts a merged call to the namespaced shape, so it has to know
    // which style this module's types promise.
    ...(ctx.argsStyle === 'flat' ? ['argsStyle: "flat"'] : []),
    // Client identification for API-owner telemetry; the runtime sends it only
    // outside browsers, and `configure({ clientHeader: false })` disables it.
    'clientHeader: "redocly-client-generator"',
  ];
  const config = fields.length > 0 ? `{ ${fields.join(', ')} }` : '{}';
  // Precedence, lowest → highest: spec defaults → baked publisher setup → app `configure()`.
  // The inner merge flattens the setup into a ClientConfig; the outer layers it OVER the
  // spec defaults (mergeSetup's second argument wins per-field; middleware composes).
  const configArg = options.setup
    ? `mergeSetup({ config: ${config} }, mergeSetup(__redoclySetup, {}))`
    : config;
  // The trailing type args narrow `ctx.operation` to the spec's literal unions.
  // `OperationTag` mirrors the descriptor block's gate: derived only when some
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
function sugarSection(ops: OperationModel[], idents: Map<string, string>): string {
  // Credentials go through `configure({ auth })` or `client.auth.*` — one way per act.
  // Per-scheme setters used to be exported here too, which gave the same act three
  // spellings and a name per scheme that operation names then had to avoid.
  const lines = ['export const { configure, use } = client;'];
  if (ops.length === 0) return lines.join('\n');
  // Bindings, never wrappers: `updateOrder` IS `client.updateOrder`, so importing the name
  // and reaching through the instance cannot disagree about the arguments. `argsStyle`
  // shapes the method itself, which is why one binding serves both styles.
  const names = ops.map((op) => idents.get(op.name)!).join(', ');
  lines.push(`export const { ${names} } = client;`);
  return lines.join('\n');
}

/** Public type surface re-exported for single-import DX (plus the `ApiError` class). */
function reexportLines(ctx: EmitContext, hasSse: boolean): string {
  const types = [
    'ClientConfig',
    'Envelope',
    'Middleware',
    'RequestOptions',
    ...(ctx.errorMode === 'result' ? ['Result'] : []),
    ...(hasSse ? ['ServerSentEvent', 'SseOptions'] : []),
  ].sort();
  return (
    // `createClient` is re-exported so package-mode consumers can build additional
    // instances from the generated module alone — symmetric with inline output.
    `export { ApiError, createClient, defaultRetryOn, TimeoutError } from '${PACKAGE_SPECIFIER}';\n` +
    `export type { ${types.join(', ')} } from '${PACKAGE_SPECIFIER}';`
  );
}
