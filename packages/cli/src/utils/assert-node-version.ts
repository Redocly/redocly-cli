import { createRequire } from 'node:module';
import * as process from 'node:process';
import * as semver from 'semver';
import { logger } from '@redocly/openapi-core';

try {
  const packageJson = createRequire(import.meta.url)('../../package.json');
  const { engines } = packageJson;
  const version = engines.node;

  if (!semver.satisfies(process.version, version)) {
    logger.warn(
      `\n⚠️ Warning: failed to satisfy expected node version. Expected: "${version}", Current "${process.version}"\n\n`
    );
  }
} catch (e) {
  // Do nothing
}
