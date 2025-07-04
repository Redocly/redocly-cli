import { spawn } from 'node:child_process';
import { logger } from '@redocly/openapi-core';
import { getPlatformSpawnArgs, sanitizeLocale, sanitizePath } from '../utils/platform.js';

import type { CommandArgs } from '../wrapper.js';
import type { VerifyConfigOptions } from '../types.js';

export type TranslationsArgv = {
  locale: string;
  'project-dir'?: string;
} & VerifyConfigOptions;

export const handleTranslations = async ({ argv }: CommandArgs<TranslationsArgv>) => {
  logger.info(`\nLaunching translate using NPX.\n\n`);
  const { npxExecutableName, sanitize, shell } = getPlatformSpawnArgs();

  const projectDir = sanitize(argv['project-dir'], sanitizePath);
  const locale = sanitize(argv.locale, sanitizeLocale);

  const child = spawn(
    npxExecutableName,
    ['-y', '@redocly/realm', 'translate', locale, `-d=${projectDir}`],
    {
      stdio: 'inherit',
      shell,
    }
  );

  child.on('error', (error) => {
    logger.info(`Translate launch failed: ${error.message}`);
    throw new Error(`Translate launch failed.`);
  });
};
