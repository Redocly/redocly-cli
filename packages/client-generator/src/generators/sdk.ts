import { join } from 'node:path';

import { emitClientSingleFile, emitClientSplit } from '../emitters/client-assembly.js';
import { anchor } from './anchor.js';
import type { Generator } from './types.js';

/**
 * The default generator: the full typed client (model types + runtime + endpoints).
 * Other generators (zod, framework hooks) emit *additional* files alongside.
 *
 * `single` mode writes the whole client to the `--output` path. `split` mode derives
 * two sibling files from that anchor — `<stem>.schemas.ts` (model types, enums,
 * const-objects, type guards; skipped when the document declares no schemas) and
 * `<stem>.ts` (everything else, which `export *`s the schemas module).
 */
export const sdkGenerator: Generator = ({ model, outputPath, outputMode, emit }) => {
  if (outputMode === 'split') {
    const { dir, stem } = anchor(outputPath);
    const { entry, schemas } = emitClientSplit(model, emit, stem);
    return [
      ...(schemas === undefined
        ? []
        : [{ path: join(dir, `${stem}.schemas.ts`), content: schemas }]),
      { path: outputPath, content: entry },
    ];
  }
  return [{ path: outputPath, content: emitClientSingleFile(model, emit) }];
};
