import { spawnSync } from 'child_process';
import { join } from 'path';

const fixturesPath = join(__dirname, 'apis');

export function getParams(indexEntryPoint: string, args: string[] = []): string[] {
  return [indexEntryPoint, ...args];
}

export function getCommandOutput(args: string[]) {
  const result = spawnSync('node', args, {
    encoding: 'utf-8',
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NO_COLOR: 'TRUE',
      FORCE_COLOR: '0',
    },
  });

  if (result.error) {
    throw new Error(`Command execution failed: ${result.error.message}`);
  }

  const out = result.stdout ? result.stdout.toString('utf-8') : '';
  const err = result.stderr ? result.stderr.toString('utf-8') : '';
  return `${out}\n${err}`;
}

export const getFixturePath = (fileName: string): string => join(fixturesPath, fileName);

export function cleanColors(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1b\[\d+m/g, '');
}
