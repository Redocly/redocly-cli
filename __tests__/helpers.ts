import { readFileSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
import { parseYaml } from '../packages/core/src/utils'; // not able to import from @redocly/openapi-core

type CLICommands =
  | 'lint'
  | 'bundle'
  | 'join'
  | 'login'
  | 'logout'
  | 'check-config'
  | 'push'
  | 'split'
  | 'stats'
  | 'build-docs';

export function getParams(
  indexEntryPoint: string,
  command: CLICommands,
  args: string[] = []
): string[] {
  return ['--transpile-only', indexEntryPoint, command, ...args];
}

export function getEntrypoints(folderPath: string) {
  const redoclyYamlFile = readFileSync(join(folderPath, 'redocly.yaml'), 'utf8');
  const redoclyYaml = parseYaml(redoclyYamlFile) as { apis: Record<string, string> };
  return Object.keys(redoclyYaml.apis);
}

export function getCommandOutput(params: string[], folderPath: string) {
  const result = spawnSync('ts-node', params, {
    cwd: folderPath,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NO_COLOR: 'TRUE',
    },
  });
  const out = result.stdout.toString('utf-8');
  const err = result.stderr.toString('utf-8');
  return `${out}\n${err}`;
}

function cleanUpVersion(str: string): string {
  return str.replace(/"version":\s(\".*\")*/g, '"version": "<version>"');
}

// Vitest serializer does not modify strings, so we need to do it manually
// https://github.com/vitest-dev/vitest/issues/5426
export function cleanupOutput(message: string) {
  const cwdRegexp = new RegExp(process.cwd(), 'g');

  const cleanedFromCwd = message.replace(cwdRegexp, '.');
  const cleanedFromVersion = cleanUpVersion(cleanedFromCwd);

  return cleanedFromVersion;
}
