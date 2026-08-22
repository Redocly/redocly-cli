import { join } from 'node:path';

import type { Generator } from '../types.js';
import { renderTransformersModule } from './render.js';

/**
 * The transformers generator: a standalone `<stem>.transformers.ts` module of
 * `transform<Name>(data: <Name>): <Name>` functions, one per IR named schema
 * that (recursively) carries a `date-time`/`date` field. Each walks the value
 * and rewrites wire ISO strings to `new Date(...)` in place, so the runtime
 * value matches the sdk's `--date-type Date` types — pair the two.
 *
 * Standalone — the consumer pipes responses through it
 * (`transformPet(await getPet(id))`); the sdk client itself stays zero-dep
 * (Date is a web standard). The transformers import only the schema TYPES from
 * the sdk entry (`./<stem>.js`) and call each other as siblings.
 *
 * Output-mode-agnostic: it reads only `model.schemas` and emits a single module
 * beside the client regardless of how the sdk partitions its files. Emits
 * nothing when no schema has a date field (nothing to transform).
 */
export const transformersGenerator: Generator = ({ model, output, banner, emit }) => {
  const content = renderTransformersModule(model, {
    sdkModule: `./${output.stem}.${emit.importExt ?? 'js'}`,
  });
  if (content === '') return [];
  const header = banner.map((line) => `// ${line}`).join('\n');
  return [
    {
      path: join(output.dir, `${output.stem}.transformers.ts`),
      content: `${header}\n\n${content}`,
    },
  ];
};
