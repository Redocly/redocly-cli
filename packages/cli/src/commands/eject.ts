import { spawn } from 'child_process';

import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';

export type EjectOptions = {
  type: 'component';
  name: string;
  contentDir?: string;
  force: boolean;
} & VerifyConfigOptions;

export const handleEject = async ({ argv }: CommandArgs<EjectOptions>) => {
  process.stdout.write(`\nLaunching eject using NPX.\n\n`);
  const npxExecutableName = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  spawn(
    npxExecutableName,
    [
      '-y',
      '@redocly/realm',
      'eject',
      `${argv.type}`,
      `${argv.name}`,
      `--contentDir=${argv.contentDir}`,
      argv.force ? `--force=${argv.force}` : '',
    ],
    { stdio: 'inherit' }
  );
};
