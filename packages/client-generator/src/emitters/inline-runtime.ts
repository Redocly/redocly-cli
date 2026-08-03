// Assembles the embedded runtime block for inline-mode clients: the real
// `src/runtime/` sources — stripped of module syntax at PREPARE time (see
// scripts/generate-runtime-sources.mjs, which owns the kept-export surface) — in
// import-graph order, followed by a local `createClient` factory wiring only the
// capabilities this API needs. Pure string concatenation: no `typescript` at
// generate time.

import { RUNTIME_SOURCES_STRIPPED, type RuntimeModuleName } from './runtime-sources.js';

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

/** The embedded runtime source block: stripped modules in dependency order + the factory. */
export function assembleInlineRuntime(needs: InlineRuntimeNeeds): string {
  // Import-graph topological order; the optional capability modules slot in where the
  // package barrel would import them (core never imports them statically).
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
  return [
    HEADER,
    ...modules.map((name) => RUNTIME_SOURCES_STRIPPED[name]),
    clientFactory(needs),
  ].join('\n\n');
}

/** The cli engine (`runCli` + types) stripped for embedding into `<stem>.cli.ts`. */
export function embedCliRuntime(): string {
  return RUNTIME_SOURCES_STRIPPED['cli.ts'];
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
