import { spawn } from 'child_process';
import { sanitizePath } from '../utils/miscellaneous';

import type { CommandArgs } from '../wrapper';
import type { VerifyConfigOptions } from '../types';

export type EjectOptions = {
  type: 'component';
  path?: string;
  'project-dir'?: string;
  force: boolean;
} & VerifyConfigOptions;

export const handleEject = async ({ argv }: CommandArgs<EjectOptions>) => {
  process.stdout.write(`\nLaunching eject using NPX.\n\n`);
  const isWindowsPlatform = process.platform === 'win32';

  const npxExecutableName = isWindowsPlatform ? 'npx.cmd' : 'npx';
  const path = isWindowsPlatform ? sanitizePath(argv.path ?? '') : argv.path ?? '';
  const projectDir = isWindowsPlatform && argv['project-dir']
    ? sanitizePath(argv['project-dir'])
    : argv['project-dir'];

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
      shell: isWindowsPlatform,
    },
  );

  child.on('error', (error) => {
    process.stderr.write(`Eject launch failed: ${error.message}`);
    throw new Error('Eject launch failed.');
  });
};

