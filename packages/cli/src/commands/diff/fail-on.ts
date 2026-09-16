import { impactRank, impacts, pluralize, type DiffSummary } from '@redocly/openapi-core';

import type { DiffFailOn } from './types.js';

export function getDiffFailure(summary: DiffSummary, failOn: DiffFailOn): string | undefined {
  if (failOn === 'none') return undefined;

  const failing = [...impacts]
    .reverse()
    .filter((impact) => impactRank(impact) >= impactRank(failOn) && summary[impact] > 0);
  if (!failing.length) return undefined;

  const total = failing.reduce((sum, impact) => sum + summary[impact], 0);
  const counted = failing.map((impact) => `${summary[impact]} ${impact}`).join(' and ');
  return `❌ Diff failed with ${counted} ${pluralize('change', total)}.`;
}
