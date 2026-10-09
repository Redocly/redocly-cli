import { HandledError, type DiffResult } from '@redocly/openapi-core';

import { nextVersion } from '../check-version.js';

export function nextVersionDiff(result: DiffResult): string {
  const next = nextVersion(result.infoVersions.base, result.bump);
  if (next === undefined) {
    throw new HandledError(
      'info.version of the base description is not a semver string, so the next version cannot be computed.'
    );
  }
  return next;
}
