import { join } from 'node:path';

import { HEADER } from '../emitters/emit-options.js';
import { renderTanstackModule } from '../emitters/tanstack-query.js';
import { anchor } from './anchor.js';
import type { Generator } from './types.js';

/**
 * The tanstack-query generator: a standalone `<stem>.tanstack.ts` module of
 * TanStack Query v5 factories that wrap the sdk operation functions —
 * `<op>QueryKey`/`<op>Options` per query (GET/HEAD), `<op>Mutation` per mutation.
 * It imports the operation functions + their `<Op>Variables` types from the sdk
 * entry (`./<stem>.js`), so it requires the `sdk` generator and targets its
 * throw-mode operation functions. The framework-agnostic `queryOptions` helper is
 * imported from `@tanstack/${queryFramework}-query` (`react` default; the body is
 * byte-identical across frameworks — `@tanstack/<framework>-query` is the consumer's peer).
 *
 * Output-mode-agnostic: `./<stem>.js` resolves to the single-file client or the
 * multi-file barrel at the output anchor either way. Emits nothing when there are
 * no operations.
 */
export const tanstackQueryGenerator: Generator = ({ model, outputPath, emit }) => {
  const { dir, stem } = anchor(outputPath);
  const content = renderTanstackModule(model, {
    argsStyle: emit.argsStyle ?? 'flat',
    sdkModule: `./${stem}.js`,
    framework: emit.queryFramework ?? 'react',
  });
  if (content === '') return [];
  return [{ path: join(dir, `${stem}.tanstack.ts`), content: `${HEADER}\n\n${content}` }];
};
