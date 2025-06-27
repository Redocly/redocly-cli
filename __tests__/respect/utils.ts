import { spawnSync } from 'child_process';
import { join } from 'path';

const fixturesPath = join(__dirname, 'apis');

export function getParams(indexEntryPoint: string, args: string[] = []): string[] {
  return [indexEntryPoint, ...args];
}

export function getCommandOutput(args: string[], env?: Record<string, string>) {
  const result = spawnSync('node', args, {
    encoding: 'utf-8',
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NO_COLOR: 'TRUE',
      FORCE_COLOR: '0',
      NODE_NO_WARNINGS: '1',
      ...env,
    },
  });

  if (result.error) {
    throw new Error(`Command execution failed: ${result.error.message}`);
  }

  const out = result.stdout ? result.stdout.toString() : '';
  const err = result.stderr ? result.stderr.toString() : '';
  return `${out}\n${err}`;
}

export const getFixturePath = (fileName: string): string => join(fixturesPath, fileName);

export function cleanColors(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1b\[\d+m/g, '');
}
