import { logger } from '@redocly/openapi-core';
import { bold, cyan, yellow } from 'colorette';
import * as process from 'node:process';
import * as semver from 'semver';

import { renderBanner } from './banner.js';
import { engines } from './package.js';

try {
  const range = engines?.node;

  if (typeof range === 'string' && !semver.satisfies(process.version, range)) {
    logger.warn(
      `\n⚠️ Warning: failed to satisfy expected node version. Expected: "${range}", Current "${process.version}"\n\n`
    );
  }

  if (semver.major(process.version) === 20) {
    logger.info(
      renderBanner([
        bold(yellow('Deprecation warning: Node.js 20 support is ending')),
        '',
        'Node.js 20 reached end-of-life on April 30, 2026.',
        'An upcoming Redocly CLI release will require Node.js 22.12.0 or later.',
        `You are using Node.js ${process.version}.`,
        '',
        `Update Node.js: ${cyan('https://nodejs.org/en/download')}`,
      ])
    );
  }
} catch (e) {
  // Do nothing
}
