// Assembles the embedded runtime block for inline-mode clients: the real
// `src/runtime/` sources (snapshotted into `RUNTIME_SOURCES`) in import-graph
// order, stripped of module syntax, followed by a local `createClient` factory
// wiring only the capabilities this API needs — the embedded equivalent of the
// package barrel (`runtime/index.ts`), which is never embedded itself.

import { RUNTIME_SOURCES, type RuntimeModuleName } from './runtime-sources.js';
import { parseStatements, ts } from './ts.js';

/** Which optional runtime capabilities the generated client must embed. */
export type InlineRuntimeNeeds = {
  multipart: boolean;
  auth: boolean;
  sse: boolean;
  setup: boolean;
};

const HEADER =
  "// ─── Embedded runtime (@redocly/client-generator, assembled per this API's needs) ───";

// The embedded block keeps `export` only on the surface the generated wiring and its
// type re-exports reference; everything else becomes module-local. `types.ts` is the
// public type surface (it replaces package-mode type imports — and TS `noUnusedLocals`
// never flags exported declarations, so unused types in a given output are fine).
const KEEP_EXPORTS: Partial<Record<RuntimeModuleName, (statement: ts.Statement) => boolean>> = {
  'types.ts': () => true,
  'errors.ts': ts.isClassDeclaration, // ApiError stays public; abortError goes local
  'setup.ts': () => true, // mergeSetup — the baked-setup wiring calls it
};

/** The embedded runtime source block: stripped modules in dependency order + the factory. */
export function assembleInlineRuntime(needs: InlineRuntimeNeeds): string {
  // Import-graph topological order; the optional capability modules slot in where the
  // package barrel would import them (core never imports them statically).
  const modules: RuntimeModuleName[] = ['types.ts', 'errors.ts', 'url.ts', 'parse.ts', 'retry.ts'];
  if (needs.multipart) modules.push('multipart.ts');
  if (needs.auth) modules.push('auth.ts');
  if (needs.setup) modules.push('setup.ts');
  modules.push('send.ts');
  if (needs.sse) modules.push('sse.ts');
  modules.push('create-client.ts');
  return [HEADER, ...modules.map(embedModule), clientFactory(needs)].join('\n\n');
}

// Strip module syntax from one runtime source: drop every import declaration (all are
// relative `./x.js` imports within the runtime) and remove the `export` modifier from
// declarations outside the kept surface. Slices are driven by AST positions from
// `parseStatements` (no regexes), so comments and formatting survive byte-for-byte.
function embedModule(name: RuntimeModuleName): string {
  const source = RUNTIME_SOURCES[name];
  const keeps = KEEP_EXPORTS[name];
  const parts: string[] = [];
  for (const statement of parseStatements(source)) {
    if (ts.isImportDeclaration(statement)) continue;
    // Full text includes leading trivia (JSDoc, blank lines), so spacing is preserved.
    const text = source.slice(statement.getFullStart(), statement.end);
    // Every top-level runtime statement is a declaration (`getModifiers` is total —
    // it returns undefined when the node carries no modifiers).
    const exportModifier = ts
      .getModifiers(statement as ts.HasModifiers)
      ?.find((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
    if (exportModifier && !keeps?.(statement)) {
      const at = exportModifier.getStart() - statement.getFullStart();
      parts.push(text.slice(0, at) + text.slice(at + 'export '.length));
    } else {
      parts.push(text);
    }
  }
  return parts.join('').trim();
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
