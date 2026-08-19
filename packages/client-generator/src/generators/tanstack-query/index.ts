import { join } from 'node:path';

import { HEADER } from '../../emitters/emit-options.js';
import { renderTanstackModule } from '../../emitters/tanstack-query.js';
import { anchor } from '../anchor.js';
import type { Generator } from '../types.js';

/**
 * The tanstack-query generator: a standalone `<stem>.tanstack.ts` module of
 * TanStack Query v5 factories over the generated client — `<op>QueryKey`/`<op>Options`
 * per query (GET/HEAD), `<op>InfiniteOptions` per paginated query, `<op>Mutation` per
 * mutation, all built by `createQueryFactories(c)` (bindable to any client instance)
 * with the module-level exports bound to the sdk's default `client`. It imports the
 * `client` instance + the `<Op>Variables` types from the sdk entry (`./<stem>.js`), so
 * it requires the `typescript` generator and its throw-mode client. The option helpers are
 * imported from `@tanstack/<framework>-query` (the consumer's peer); the registry binds
 * one framework per generator name, and the emitted body is byte-identical across them.
 *
 * Output-mode-agnostic: `./<stem>.js` resolves to the single-file client or the
 * multi-file barrel at the output anchor either way. Emits nothing when there are
 * no operations.
 */
export function tanstackQueryGenerator(framework: 'react' | 'vue' | 'svelte' | 'solid'): Generator {
  return ({ model, outputPath, emit }) => {
    const { dir, stem } = anchor(outputPath);
    const content = renderTanstackModule(model, {
      argsStyle: emit.argsStyle ?? 'grouped',
      sdkModule: `./${stem}.${emit.importExt ?? 'js'}`,
      framework,
      pagination: emit.pagination,
      queryKeyPrefix: emit.queryKeyPrefix,
    });
    if (content === '') return [];
    return [{ path: join(dir, `${stem}.tanstack.ts`), content: `${HEADER}\n\n${content}` }];
  };
}
