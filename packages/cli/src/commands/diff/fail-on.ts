import { pluralize } from '@redocly/openapi-core';

import type { DiffSummary } from './engine/types.js';

export type DiffFailOn = 'breaking' | 'none';

export function getDiffFailure(summary: DiffSummary, failOn: DiffFailOn): string | undefined {
  if (failOn === 'breaking' && summary.breaking > 0) {
    return `❌ Diff failed with ${summary.breaking} breaking ${pluralize(
      'change',
      summary.breaking
    )}.`;
  }
  return undefined;
}
