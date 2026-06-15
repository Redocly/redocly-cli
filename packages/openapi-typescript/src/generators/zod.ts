import { join } from 'node:path';

import { HEADER } from '../emitters/client.js';
import { renderZodModule } from '../emitters/zod.js';
import { anchor } from '../writers/util.js';
import type { Generator } from './types.js';

/**
 * The zod generator: a standalone `<stem>.zod.ts` module of Zod schemas (one
 * `export const <Name>Schema` per IR named schema), validated by the consumer
 * (`PetSchema.parse(data)`; `z.infer` derives the type). The sdk client stays
 * dependency-free — zod is the consumer's peer.
 *
 * Phase 1 is output-mode-agnostic: it reads only `model.schemas` and emits a
 * single module beside the client regardless of how the sdk partitions its files.
 * Emits nothing when there are no schemas.
 */
export const zodGenerator: Generator = ({ model, outputPath }) => {
  const content = renderZodModule(model.schemas);
  if (content === '') return [];
  const { dir, stem } = anchor(outputPath);
  return [{ path: join(dir, `${stem}.zod.ts`), content: `${HEADER}\n\n${content}` }];
};
