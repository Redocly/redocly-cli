import { spawnSync } from 'child_process';
import { join } from 'path';

const fixturesPath = join(__dirname, '../tests');

export function getParams(indexEntryPoint: string, args: string[] = []): string[] {
  return [indexEntryPoint, ...args];
}

export function getCommandOutput(params: string[], folderPath: string = fixturesPath) {
  const result = spawnSync('node', params, {
    cwd: folderPath,
    // stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NO_COLOR: 'TRUE',
      FORCE_COLOR: '0',
    },
  });
  const out = result.stdout.toString('utf-8');
  const err = result.stderr.toString('utf-8');
  return `${out}\n${err}`;
}

export const getFixturePath = (fileName: string): string => join(fixturesPath, fileName);
