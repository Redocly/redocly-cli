import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseYaml } from '../../packages/core/src/utils/yaml-fs-helper.js'; // not able to import from @redocly/openapi-core

export function getParams(indexEntryPoint: string, args: string[] = []): string[] {
  return [indexEntryPoint, ...args];
}

export function getCommandOutput(
  args: string[],
  options?: { env?: Record<string, string>; testPath?: string }
) {
  const result = spawnSync('node', args, {
    encoding: 'utf-8',
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      NO_COLOR: 'TRUE',
      FORCE_COLOR: '0',
      ...options?.env,
    },
    cwd: options?.testPath,
  });

  if (result.error) {
    throw new Error(`Command execution failed: ${result.error.message}`);
  }

  const out = result.stdout ? result.stdout.toString() : '';
  const err = result.stderr ? result.stderr.toString() : '';
  return `${out}\n${err}`;
}

export function getEntrypoints(folderPath: string) {
  const redoclyYamlFile = readFileSync(join(folderPath, 'redocly.yaml'), 'utf8');
  const redoclyYaml = parseYaml(redoclyYamlFile) as { apis: Record<string, string> };
  return Object.keys(redoclyYaml.apis);
}

function cleanUpVersion(str: string): string {
  return str.replace(/"version":\s(".*")*/g, '"version": "<version>"');
}

// Vitest serializer does not modify strings, so we need to do it manually
// https://github.com/vitest-dev/vitest/issues/5426
export function cleanupOutput(message: string) {
  const cwdRegexp = new RegExp(process.cwd(), 'g');

  const cleanedFromCwd = message.replace(cwdRegexp, '.');
  const cleanedFromVersion = cleanUpVersion(cleanedFromCwd);

  return cleanedFromVersion;
}
