// Assembles the embedded runtime block for inline-mode clients: the real
// `src/runtime/` sources — stripped of module syntax at PREPARE time (see
// scripts/generate-runtime-sources.mjs, which owns the kept-export surface) — in
// import-graph order, followed by a local `createClient` factory wiring only the
// capabilities this API needs. Pure string concatenation: no `typescript` at
// generate time.

import {
  RUNTIME_SOURCES,
  RUNTIME_SOURCES_STRIPPED,
  type RuntimeModuleName,
} from './runtime-sources.js';

/** Which optional runtime capabilities the generated client must embed. */
export type InlineRuntimeNeeds = {
  multipart: boolean;
  auth: boolean;
  sse: boolean;
  setup: boolean;
  paginate: boolean;
};

const HEADER =
  "// ─── Embedded runtime (@redocly/client-generator, assembled per this API's needs) ───";

/** The per-needs module set, in import-graph topological order (both modes share it). */
function runtimeModules(needs: InlineRuntimeNeeds): RuntimeModuleName[] {
  // The optional capability modules slot in where the runtime barrel would import
  // them (core never imports them statically).
  const modules: RuntimeModuleName[] = ['types.ts', 'errors.ts', 'url.ts', 'parse.ts', 'retry.ts'];
  if (needs.multipart) modules.push('multipart.ts');
  if (needs.auth) modules.push('auth.ts');
  if (needs.setup) modules.push('setup.ts');
  // paginate.ts has only type imports (types.ts + create-client.ts's OperationArgs),
  // so it can sit anywhere; keep it with the other capability modules, before send.ts.
  if (needs.paginate) modules.push('paginate.ts');
  modules.push('send.ts');
  if (needs.sse) modules.push('sse.ts');
  modules.push('create-client.ts');
  return modules;
}

/** The embedded runtime source block: stripped modules in dependency order + the factory. */
export function assembleInlineRuntime(needs: InlineRuntimeNeeds): string {
  return [
    HEADER,
    ...runtimeModules(needs).map((name) => RUNTIME_SOURCES_STRIPPED[name]),
    clientFactory(needs),
  ].join('\n\n');
}

/**
 * The runtime as real files (`runtime: 'module'`): the same per-needs modules, RAW —
 * imports intact, exactly as authored — plus `factory.ts`, the per-needs `createClient`
 * wiring as a module importing what it references from its siblings. `importExt`
 * rewrites the intra-runtime specifiers for consumers that resolve them literally.
 */
export function runtimeModuleFiles(
  needs: InlineRuntimeNeeds,
  importExt: 'js' | 'ts' = 'js'
): Array<{ name: string; content: string }> {
  const files = [
    ...runtimeModules(needs).map((name) => ({ name, content: RUNTIME_SOURCES[name] })),
    { name: 'factory.ts', content: moduleFactory(needs) },
  ];
  if (importExt === 'js') return files;
  return files.map(({ name, content }) => ({
    name,
    content: content.replace(/(from '\.\/[a-z-]+)\.js'/g, "$1.ts'"),
  }));
}

/** `factory.ts`: the sibling-module equivalent of the inline factory block. */
function moduleFactory(needs: InlineRuntimeNeeds): string {
  const imports = [
    "import { createClientCore } from './create-client.js';",
    ...(needs.multipart ? ["import { toFormData } from './multipart.js';"] : []),
    ...(needs.auth ? ["import { resolveAuth } from './auth.js';"] : []),
    ...(needs.paginate
      ? ["import { items, itemsByLink, pages, pagesByLink } from './paginate.js';"]
      : []),
    ...(needs.sse ? ["import { sse } from './sse.js';"] : []),
    `import type {
  Client,
  ClientConfig,
  OperationContext,
  OperationDescriptor,
  OpsShape,
} from './types.js';`,
  ];
  // The client entry re-exports this module, so the factory carries the same public
  // surface the inline embed leaves in module scope (the kept-export set).
  const reexports = [
    "export { ApiError, TimeoutError } from './errors.js';",
    "export { defaultRetryOn } from './retry.js';",
    ...(needs.setup ? ["export { mergeSetup } from './setup.js';"] : []),
    "export type * from './types.js';",
  ];
  return [imports.join('\n'), clientFactory(needs), reexports.join('\n')].join('\n\n');
}

/** The cli engine (`runCli` + types) stripped for embedding into `<stem>.cli.ts`. */
export function embedCliRuntime(): string {
  return RUNTIME_SOURCES_STRIPPED['cli.ts'];
}

/** The cli engine RAW, for `runtime: 'module'` (written as `runtime/cli.ts`). */
export function cliRuntimeSource(): string {
  return RUNTIME_SOURCES['cli.ts'];
}

// The embedded equivalent of the package barrel's `createClient`: `createClientCore`
// with only the included capabilities wired. EXPORTED — the design spec promises the
// generated module re-exports `createClient`/`OPERATIONS`/`Ops` so apps can build
// additional per-tenant instances over the same descriptors.
function clientFactory(needs: InlineRuntimeNeeds): string {
  const caps = [
    ...(needs.multipart ? ['serializeMultipart: toFormData'] : []),
    ...(needs.auth ? ['resolveAuth'] : []),
    ...(needs.sse ? ['sse'] : []),
    ...(needs.paginate ? ['paginate: { pages, items, pagesByLink, itemsByLink }'] : []),
  ];
  const wired = caps.length > 0 ? `{ ${caps.join(', ')} }` : '{}';
  return `/**
 * The client factory: \`createClientCore\` wired with the capabilities this API needs.
 * Exported so apps can build additional instances (per-tenant, per-environment) over
 * the same \`OPERATIONS\`/\`Ops\`. The trailing string params carry the wiring's literal
 * unions (\`OperationId\`/\`OperationPath\`/\`OperationTag\`) into \`ctx.operation\`.
 */
export function createClient<
  Ops extends OpsShape,
  Id extends string = string,
  Path extends string = string,
  Tag extends string = string,
>(
  operations: Record<string, OperationDescriptor>,
  config?: ClientConfig<OperationContext<Id, Path, Tag>>
): Client<Ops, OperationContext<Id, Path, Tag>> {
  return createClientCore<Ops, Id, Path, Tag>(operations, config, ${wired});
}`;
}
