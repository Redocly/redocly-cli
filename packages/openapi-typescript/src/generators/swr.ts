import { join } from 'node:path';

import { HEADER } from '../emitters/client.js';
import { renderSwrModule } from '../emitters/swr.js';
import { anchor } from '../writers/util.js';
import type { Generator } from './types.js';

/**
 * The swr generator: a standalone `<stem>.swr.ts` module of SWR hooks wrapping the
 * sdk operation functions — `<op>Key` + `use<Op>` (`useSWR`) per query (GET/HEAD),
 * `use<Op>` (`useSWRMutation`) per mutation. It imports the operation functions +
 * their `<Op>Variables` types from the sdk entry (`./<stem>.js`), so it requires the
 * `sdk` generator and targets its throw-mode functions facade. `swr`/`swr/mutation`
 * are the consumer's peer; the sdk client stays dependency-free.
 *
 * Output-mode-agnostic: `./<stem>.js` resolves to the single-file client or the
 * multi-file barrel at the output anchor either way. Emits nothing when there are
 * no operations.
 */
export const swrGenerator: Generator = ({ model, outputPath, emit }) => {
  const { dir, stem } = anchor(outputPath);
  const content = renderSwrModule(model, {
    argsStyle: emit.argsStyle ?? 'flat',
    sdkModule: `./${stem}.js`,
  });
  if (content === '') return [];
  return [{ path: join(dir, `${stem}.swr.ts`), content: `${HEADER}\n\n${content}` }];
};
