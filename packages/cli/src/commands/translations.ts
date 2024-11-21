import { spawn } from 'child_process';
import { sanitizeLocale, sanitizePath } from '../utils/sanitize';

import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';

export type TranslationsOptions = {
  locale: string;
  'project-dir'?: string;
} & VerifyConfigOptions;

export const handleTranslations = async ({ argv }: CommandArgs<TranslationsOptions>) => {
  process.stdout.write(`\nLaunching translate using NPX.\n\n`);
  const isWindowsPlatform = process.platform === 'win32';

  const npxExecutableName = isWindowsPlatform ? 'npx.cmd' : 'npx';
  const projectDir = isWindowsPlatform && argv['project-dir']
    ? sanitizePath(argv['project-dir'])
    : argv['project-dir'];
  const locale = isWindowsPlatform ? sanitizeLocale(argv.locale) : argv.locale;

  const child = spawn(
    npxExecutableName,
    ['-y', '@redocly/realm', 'translate', locale, `-d=${projectDir}`],
    {
      stdio: 'inherit',
      shell: isWindowsPlatform,
    }
  );

  child.on('error', (error) => {
    process.stderr.write(`Translate launch failed: ${error.message}`);
    throw new Error(`Translate launch failed.`);
  });
};
