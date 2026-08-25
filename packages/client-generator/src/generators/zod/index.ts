import type { Generator } from '@redocly/client-generator';
import { join } from 'node:path';

import { renderZodModule } from './schemas.ts';

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
export const zodGenerator: Generator = ({ model, output, banner }) => {
  const content = renderZodModule(model);
  if (content === '') return [];
  const header = banner.map((line) => `// ${line}`).join('\n');
  return [{ path: join(output.dir, `${output.stem}.zod.ts`), content: `${header}\n\n${content}` }];
};
