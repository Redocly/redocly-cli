import { logger } from '@redocly/openapi-core';
import { spawn } from 'node:child_process';

import { getPackageRunner, sanitizePath } from '../utils/platform.js';
import type { CommandArgs } from '../wrapper.js';

export type EjectArgv = {
  type: 'component';
  path?: string;
  'project-dir'?: string;
  force: boolean;
};

export const handleEject = async ({ argv }: CommandArgs<EjectArgv>) => {
  logger.info(`\nLaunching eject.\n\n`);
  const { command, args, env, sanitize, shell } = getPackageRunner('@redocly/realm');

  const path = sanitize(argv.path, sanitizePath);
  const projectDir = sanitize(argv['project-dir'], sanitizePath);

  const child = spawn(
    command,
    [
      ...args,
      'eject',
      `${argv.type}`,
      path,
      `-d=${projectDir}`,
      argv.force ? `--force=${argv.force}` : '',
    ],
    {
      stdio: 'inherit',
      env,
      shell,
    }
  );

  child.on('error', (error) => {
    logger.info(`Eject launch failed: ${error.message}`);
    throw new Error('Eject launch failed.');
  });
};
