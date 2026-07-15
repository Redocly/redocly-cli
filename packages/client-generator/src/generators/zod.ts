import { join } from 'node:path';

import { HEADER } from '../emitters/client.js';
import { renderZodModule } from '../emitters/zod.js';
import { anchor } from '../writers/util.js';
import type { Generator } from './types.js';

/**
 * The zod generator: a standalone `<stem>.zod.ts` module of Zod schemas (one
 * `export const <Name>Schema` per IR named schema), plus runtime validation for
 * the client — the `operationSchemas` request/response map and the `zodValidation`
 * middleware (`use(zodValidation())`). The sdk client stays dependency-free —
 * zod is the consumer's peer, and the module imports nothing from the client.
 *
 * Output-mode-agnostic: emits a single module beside the client regardless of
 * how the sdk partitions its files. Emits nothing when the model has neither
 * named schemas nor JSON operation bodies.
 */
export const zodGenerator: Generator = ({ model, outputPath }) => {
  const content = renderZodModule(model);
  if (content === '') return [];
  const { dir, stem } = anchor(outputPath);
  return [{ path: join(dir, `${stem}.zod.ts`), content: `${HEADER}\n\n${content}` }];
};
