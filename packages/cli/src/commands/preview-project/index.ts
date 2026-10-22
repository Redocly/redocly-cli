import { logger } from '@redocly/openapi-core';
import { spawn } from 'node:child_process';

import { getPlatformSpawnArgs } from '../../utils/platform.js';
import type { CommandArgs } from '../../wrapper.js';
import { FRAMEWORK_PACKAGE } from './constants.js';
import type { PreviewProjectArgv } from './types.js';

export const previewProject = async ({ argv }: CommandArgs<PreviewProjectArgv>) => {
  const { plan, port } = argv;
  const projectDir = argv['project-dir'];

  if (argv.product) {
    logger.warn(
      `The --product option is deprecated and ignored: the preview always runs ${FRAMEWORK_PACKAGE}.\n`
    );
  }

  logger.info(`\nLaunching preview with ${FRAMEWORK_PACKAGE} on the ${plan} plan using NPX.\n\n`);
  const { npxExecutableName, shell } = getPlatformSpawnArgs();

  const child = spawn(
    npxExecutableName,
    ['-y', FRAMEWORK_PACKAGE, 'preview', `--plan=${plan}`, `--port=${port || 4000}`],
    {
      stdio: 'inherit',
      cwd: projectDir,
      shell,
    }
  );

  child.on('error', (error) => {
    logger.info(`Project preview launch failed: ${error.message}`);
    throw new Error(`Project preview launch failed.`);
  });
};
