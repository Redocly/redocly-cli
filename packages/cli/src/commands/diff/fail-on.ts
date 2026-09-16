import { pluralize, type DiffSummary } from '@redocly/openapi-core';

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
