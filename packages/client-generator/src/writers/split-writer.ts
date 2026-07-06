import { join } from 'node:path';

import { emitClientSplit } from '../emitters/package-client.js';
import type { Writer } from './types.js';
import { anchor } from './util.js';

/**
 * `split` mode: two sibling files derived from the `--output` anchor, for both
 * runtime distributions.
 *
 *   <stem>.schemas.ts  model types, enums, const-objects, and type guards
 *   <stem>.ts          everything else (runtime, wiring, client, sugar), which
 *                      `export *`s the schemas module and type-imports exactly
 *                      the schema names it references
 *
 * The schemas file is skipped entirely when the document declares no schemas.
 */
export const splitWriter: Writer = ({ model, outputPath, emit }) => {
  const { dir, stem } = anchor(outputPath);
  const { entry, schemas } = emitClientSplit(model, emit, stem);
  return [
    ...(schemas === undefined ? [] : [{ path: join(dir, `${stem}.schemas.ts`), content: schemas }]),
    { path: outputPath, content: entry },
  ];
};
