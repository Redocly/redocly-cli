import { join } from 'node:path';

import { HEADER } from '../emitters/client.js';
import { renderMockModule } from '../emitters/mock.js';
import { anchor } from '../writers/util.js';
import type { Generator } from './types.js';

/**
 * The mock generator: a standalone `<stem>.mocks.ts` module of MSW handlers and
 * data factories baked from the spec. Imports `msw` (the consumer's dev-dep); the
 * sdk client stays dependency-free. Output-mode-agnostic in v1 — one module beside
 * the client. Emits nothing when there are no operations.
 */
export const mockGenerator: Generator = ({ model, outputPath, emit }) => {
  const { dir, stem } = anchor(outputPath);
  const content = renderMockModule(model, {
    sdkModule: `./${stem}.js`,
    dateType: emit.dateType,
    mockData: emit.mockData,
    mockSeed: emit.mockSeed,
  });
  if (content === '') return [];
  return [{ path: join(dir, `${stem}.mocks.ts`), content: `${HEADER}\n\n${content}` }];
};
