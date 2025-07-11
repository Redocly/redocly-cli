import { spawn } from 'node:child_process';
import { logger } from '@redocly/openapi-core';
import { getPlatformSpawnArgs, sanitizePath } from '../utils/platform.js';

import type { CommandArgs } from '../wrapper.js';
import type { VerifyConfigOptions } from '../types.js';

export type EjectArgv = {
  type: 'component';
  path?: string;
  'project-dir'?: string;
  force: boolean;
} & VerifyConfigOptions;

export const handleEject = async ({ argv }: CommandArgs<EjectArgv>) => {
  logger.info(`\nLaunching eject using NPX.\n\n`);
  const { npxExecutableName, sanitize, shell } = getPlatformSpawnArgs();

  const path = sanitize(argv.path, sanitizePath);
  const projectDir = sanitize(argv['project-dir'], sanitizePath);

  const child = spawn(
    npxExecutableName,
    [
      '-y',
      '@redocly/realm',
      'eject',
      `${argv.type}`,
      path,
      `-d=${projectDir}`,
      argv.force ? `--force=${argv.force}` : '',
    ],
    {
      stdio: 'inherit',
      shell,
    }
  );

  child.on('error', (error) => {
    logger.info(`Eject launch failed: ${error.message}`);
    throw new Error('Eject launch failed.');
  });
};
