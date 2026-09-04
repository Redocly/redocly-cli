import type { Generator } from '@redocly/client-generator';
import { join } from 'node:path';

import { renderMockModule } from './render.ts';

/**
 * The mock generator: a standalone `<stem>.mocks.ts` module of MSW handlers and
 * data factories baked from the spec. Imports `msw` (the consumer's dev-dep); the
 * sdk client stays dependency-free. Output-mode-agnostic in v1 — one module beside
 * the client. Emits nothing when there are no operations.
 */
export const mockGenerator: Generator = ({ model, output, banner, emit }) => {
  const header = banner.map((line) => `// ${line}`).join('\n');
  const content = renderMockModule(model, {
    sdkModule: `./${output.stem}.${emit.importExt ?? 'js'}`,
    dateType: emit.dateType,
    mockData: emit.mockData,
    mockSeed: emit.mockSeed,
  });
  if (content === '') return [];
  return [
    { path: join(output.dir, `${output.stem}.mocks.ts`), content: `${header}\n\n${content}` },
  ];
};
