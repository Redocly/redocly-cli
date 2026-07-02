import { logger } from '@redocly/openapi-core';
import * as process from 'node:process';
import * as semver from 'semver';

import { engines } from './package.js';

try {
  const range = engines?.node;

  if (typeof range === 'string' && !semver.satisfies(process.version, range)) {
    logger.warn(
      `\n⚠️ Warning: failed to satisfy expected node version. Expected: "${range}", Current "${process.version}"\n\n`
    );
  }
} catch (e) {
  // Do nothing
}
