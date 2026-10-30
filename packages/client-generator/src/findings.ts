import { logger } from '@redocly/openapi-core';
import { AsyncLocalStorage } from 'node:async_hooks';

import type { GenerateClientFinding, GenerateClientOptions } from './types.js';

// The listener of the `generateClient` call that is running. The warnings come from deep in the
// pipeline, so the listener travels with the async context instead of through every call.
export const findingListener = new AsyncLocalStorage<GenerateClientOptions['onFinding']>();

/** Logs the finding as a warning and passes it to the `onFinding` listener of the run. */
export function reportFinding(finding: GenerateClientFinding): void {
  logger.warn(`generate-client: ${finding.message}\n`);
  findingListener.getStore()?.(finding);
}
