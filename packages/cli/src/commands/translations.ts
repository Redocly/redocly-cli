import { spawn } from 'child_process';

import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';

export type TranslationsOptions = {
  locale: string;
  'project-dir'?: string;
} & VerifyConfigOptions;

export const handleTranslations = async ({ argv }: CommandArgs<TranslationsOptions>) => {
  process.stdout.write(`\nLaunching translations using NPX.\n\n`);
  const npxExecutableName = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  spawn(
    npxExecutableName,
    ['-y', '@redocly/realm', 'translations', argv.locale, `--project-dir=${argv['project-dir']}`],
    { stdio: 'inherit' }
  );
};
