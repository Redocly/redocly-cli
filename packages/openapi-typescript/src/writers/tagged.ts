import { join } from 'node:path';

import { emitModules, moduleSpecifier, serviceClassName } from '../emitters/client.js';
import { joinSections } from '../emitters/support.js';
import { groupByTag } from './group-by-tag.js';
import type { GeneratedFile, WriterInput } from './types.js';
import { anchor } from './util.js';

/**
 * Shared builder for the two tag-based layouts:
 *
 * - `nested = false` → `tags` mode: one `<tag>.ts` per tag beside the shared
 *   `<stem>.http.ts` / `<stem>.schemas.ts`.
 * - `nested = true` → `tags-split` mode: a `<tag>/<stem>.ts` folder per tag, with
 *   the shared modules still at the root.
 *
 * Both share the root http + schemas modules and a `<stem>.ts` barrel entry that
 * re-exports everything; only the per-tag file paths and their relative imports
 * differ. Operations are grouped first-tag-wins; untagged → `default`.
 */
export function buildTaggedClient(
  { model, outputPath, emit }: WriterInput,
  nested: boolean
): GeneratedFile[] {
  const { dir, stem } = anchor(outputPath);
  const m = emitModules(model, emit);
  const groups = groupByTag(model, stem);
  const importPrefix = nested ? '../' : './';

  const files: GeneratedFile[] = [
    { path: join(dir, `${stem}.http.ts`), content: m.http },
    { path: join(dir, `${stem}.schemas.ts`), content: m.schemas },
  ];

  for (const group of groups) {
    const operations = m.renderEndpoints(group.operations, serviceClassName(group.stem));
    const path = nested ? join(dir, group.stem, `${stem}.ts`) : join(dir, `${group.stem}.ts`);
    files.push({
      path,
      content: joinSections([
        m.header,
        m.endpointImports(group.operations, stem, importPrefix),
        operations,
      ]),
    });
  }

  const reexports: string[] = [];
  if (m.hasSchemas) reexports.push(`export * from '${moduleSpecifier(stem, 'schemas')}';`);
  reexports.push(m.publicReexport(stem));
  for (const group of groups) {
    const spec = nested ? `./${group.stem}/${stem}.js` : `./${group.stem}.js`;
    reexports.push(`export * from '${spec}';`);
  }
  // Functions facade: per-tag SSE aggregates aren't `export *`-reachable (they're
  // named `__sse_<Class>`), so merge them into a single barrel-level `sse`.
  const sseBarrel = m.sseBarrel(
    groups.map((group) => ({
      tagStem: group.stem,
      moduleSpec: nested ? `./${group.stem}/${stem}.js` : `./${group.stem}.js`,
      ops: group.operations,
    }))
  );
  if (sseBarrel) reexports.push(sseBarrel);
  files.push({ path: outputPath, content: joinSections([m.header, reexports.join('\n')]) });

  return files;
}
