import { logger } from '@redocly/openapi-core';
import { spawn } from 'node:child_process';

import { getPackageRunner, sanitizeLocale, sanitizePath } from '../utils/platform.js';
import type { CommandArgs } from '../wrapper.js';

export type TranslationsArgv = {
  locale: string;
  'project-dir'?: string;
};

export const handleTranslations = async ({ argv }: CommandArgs<TranslationsArgv>) => {
  logger.info(`\nLaunching translate.\n\n`);
  const { command, args, env, sanitize, shell } = getPackageRunner('@redocly/realm');

  const projectDir = sanitize(argv['project-dir'], sanitizePath);
  const locale = sanitize(argv.locale, sanitizeLocale);

  const child = spawn(command, [...args, 'translate', locale, `-d=${projectDir}`], {
    stdio: 'inherit',
    env,
    shell,
  });

  child.on('error', (error) => {
    logger.info(`Translate launch failed: ${error.message}`);
    throw new Error(`Translate launch failed.`);
  });
};
