// Client assembly, shared by both output modes. The generated file embeds the
// assembled runtime sources (./inline-runtime.ts). Single-file layout:
// schema types → type guards → `<Op>*` aliases → Ops → OPERATIONS → embedded
// runtime → (baked setup) → client instance → sugar — the embedded types are
// already exported in place, so no re-exports. Split mode moves the schema types +
// guards into a sibling `<stem>.schemas.ts` the entry re-exports (`emitClientSplit`).
// Text templates throughout — no `typescript` at generate time.

import {
  allOperations,
  type ApiModel,
  type EmitOptions,
  type OperationModel,
} from '@redocly/client-generator';
import { codeString } from '@redocly/client-generator/printers/typescript';

import { banner, HEADER, renderTitleComment } from './banner.ts';
import { packageIdents, renderDescriptors } from './descriptor.ts';
import {
  assembleInlineRuntime,
  type InlineRuntimeNeeds,
  runtimeModuleFiles,
} from './inline-runtime.ts';
import { isTypedMultipart } from './operation-types.ts';
import {
  collectEntrySchemaRefs,
  type EmitContext,
  renderAliases,
  renderOpsType,
} from './render-client.ts';
import { renderTypeAliases } from './ts-type.ts';
import { renderTypeGuards } from './type-guards.ts';

export function emitClientSingleFile(model: ApiModel, options: EmitOptions = {}): string {
  return emitClient(model, options).entry;
}

/** Which optional runtime capabilities this API needs (drives both distribution modes). */
export function runtimeNeeds(model: ApiModel, options: EmitOptions): InlineRuntimeNeeds {
  const ops = allOperations(model.services);
  return {
    multipart: ops.some((op) => op.requestBody && isTypedMultipart(op.requestBody)),
    // Auth sugar needs schemes; `resolveAuth` fires when a descriptor carries
    // `security` — a valid spec implies the former, but embed on either.
    auth: model.securitySchemes.length > 0 || ops.some((op) => op.security.length > 0),
    sse: ops.some((op) => op.sse !== undefined),
    setup: !!options.setup,
    paginate: (options.pagination ?? new Map()).size > 0,
  };
}

/**
 * `runtime: 'module'`: the runtime files written into `runtime/` beside the client —
 * the raw per-needs modules plus the generated factory, each under the standard banner.
 */
export function emitRuntimeFiles(
  model: ApiModel,
  options: EmitOptions
): Array<{ name: string; content: string }> {
  if (options.runtime !== 'module') return [];
  return runtimeModuleFiles(runtimeNeeds(model, options), options.importExt ?? 'js').map(
    ({ name, content }) => ({ name, content: `${HEADER}\n\n${content.trim()}\n` })
  );
}

/**
 * The module-mode replacement for the embedded block: the entry imports what its own
 * code references and re-exports the factory's public surface (the same names the
 * inline embed leaves in module scope).
 */
function runtimeImports(options: EmitOptions, ctx: EmitContext, hasOps: boolean): string {
  const ext = options.importExt ?? 'js';
  const typeNames = [
    'OperationDescriptor',
    ...(options.setup ? ['ClientConfig', 'Middleware'] : []),
    ...(ctx.errorMode === 'result' && hasOps ? ['Result'] : []),
  ].sort();
  return [
    `import { createClient${options.setup ? ', mergeSetup' : ''} } from './runtime/factory.${ext}';`,
    `import type { ${typeNames.join(', ')} } from './runtime/types.${ext}';`,
    `export * from './runtime/factory.${ext}';`,
  ].join('\n');
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

  const runtimeSection =
    options.runtime === 'module'
      ? runtimeImports(options, ctx, ops.length > 0)
      : assembleInlineRuntime(runtimeNeeds(model, options));
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

  // Layout puts the reader's OWN API first (types → aliases → Ops → OPERATIONS) and the
  // machinery after it. The runtime block sits between the descriptors and the `client`
  // initializer — after it for readability, before `client` so every declaration the
  // module-init call chain touches (hoisted functions AND any future top-level const)
  // is already evaluated.
  const moduleMode = options.runtime === 'module';
  if (splitStem === undefined) {
    return {
      entry: banner([
        HEADER,
        renderTitleComment(model),
        ...(moduleMode ? [runtimeSection] : []),
        [schemaSection, bodySection].filter((section) => section.length > 0).join('\n\n'),
        ...(moduleMode ? [] : [runtimeSection]),
        clientSection(options, ctx, model),
        sugar,
      ]),
    };
  }

  const hasSchemas = schemaSection.length > 0;
  return {
    entry: banner([
      HEADER,
      renderTitleComment(model),
      ...(moduleMode ? [runtimeSection] : []),
      hasSchemas
        ? schemaLinks(model, ctx, `./${splitStem}.schemas.${options.importExt ?? 'js'}`)
        : '',
      bodySection,
      ...(moduleMode ? [] : [runtimeSection]),
      clientSection(options, ctx, model),
      sugar,
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
