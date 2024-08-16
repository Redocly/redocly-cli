import { spawn } from 'child_process';

import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';

export type TranslateProjectOptions = {
  locale: string[];
  contentDir?: string;
} & VerifyConfigOptions;

export const translateProject = async ({ argv }: CommandArgs<TranslateProjectOptions>) => {
  process.stdout.write(`\nLaunching translations using NPX.\n\n`);
  const npxExecutableName = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  spawn(
    npxExecutableName,
    [
      '-y',
      '@redocly/realm',
      'translations',
      ...argv.locale.map((l) => `--locale=${l}`),
      `--contentDir=${argv.contentDir}`,
    ],
    { stdio: 'inherit' }
  );
};
