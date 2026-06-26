import { join } from 'node:path';

import { emitModules, moduleSpecifier } from '../emitters/client.js';
import { joinSections } from '../emitters/support.js';
import type { Writer } from './types.js';
import { allOperations, anchor } from './util.js';

/**
 * `split` mode: three sibling files derived from the `--output` anchor.
 *
 *   <stem>.http.ts     shared runtime + auth state + public setters
 *   <stem>.schemas.ts  model types, enums, const-objects, and type guards
 *   <stem>.ts          endpoints + the entry that re-exports the public surface
 *
 * The endpoints file imports exactly the types it references (from the schemas
 * module) and exactly the runtime helpers it uses (from the http module), so each
 * file type-checks cleanly under `noUnusedLocals`.
 */
export const splitWriter: Writer = ({ model, outputPath, emit }) => {
  const { dir, stem } = anchor(outputPath);
  const m = emitModules(model, emit);
  const ops = allOperations(model.services);

  const reexports: string[] = [];
  if (m.hasSchemas) reexports.push(`export * from '${moduleSpecifier(stem, 'schemas')}';`);
  reexports.push(m.publicReexport(stem));

  const entryContent = joinSections([
    m.header,
    m.endpointImports(ops, stem),
    reexports.join('\n'),
    m.operations,
  ]);

  return [
    { path: join(dir, `${stem}.http.ts`), content: m.http },
    { path: join(dir, `${stem}.schemas.ts`), content: m.schemas },
    { path: outputPath, content: entryContent },
  ];
};
