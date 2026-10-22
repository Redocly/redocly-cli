import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseYaml } from '../../packages/core/src/utils/yaml-fs-helper.js'; // not able to import from @redocly/openapi-core

export function getParams(indexEntryPoint: string, args: string[] = []): string[] {
  return [indexEntryPoint, ...args];
}

export type CommandResult = { status: number | null; stdout: string; stderr: string };

type CommandOptions = { env?: Record<string, string>; testPath?: string };

// `NODE_ENV=test` turns off the update notifier, and the color variables keep the output plain.
const TEST_ENV = { NODE_ENV: 'test', NO_COLOR: 'TRUE', FORCE_COLOR: '0' };

/** Run a command and return its exit status, stdout, and stderr. */
export function runCommandResult(
  command: string,
  args: string[],
  options?: CommandOptions
): CommandResult {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    stdio: 'pipe',
    env: { ...process.env, ...TEST_ENV, ...options?.env },
    cwd: options?.testPath,
  });

  if (result.error) {
    throw new Error(`Command execution failed: ${result.error.message}`);
  }

  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

export function runCommand(command: string, args: string[], options?: CommandOptions) {
  const result = runCommandResult(command, args, options);
  return `${result.stdout}\n${result.stderr}`;
}

/**
 * Run a command without blocking the test process and return its exit status, stdout, and
 * stderr. A `timeout` kills a command that hangs, so the test fails instead of waiting.
 */
export async function runCommandResultAsync(
  command: string,
  args: string[],
  options?: CommandOptions & { timeout?: number }
): Promise<CommandResult> {
  const child = spawn(command, args, {
    env: { ...process.env, ...TEST_ENV, ...options?.env },
    cwd: options?.testPath,
    timeout: options?.timeout,
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => (stdout += chunk));
  child.stderr.on('data', (chunk) => (stderr += chunk));
  const [status] = await once(child, 'close');

  return { status, stdout, stderr };
}

export async function runCommandAsync(command: string, args: string[], options?: CommandOptions) {
  const result = await runCommandResultAsync(command, args, options);
  return `${result.stdout}\n${result.stderr}`;
}

export function getCommandOutput(
  args: string[],
  options?: { env?: Record<string, string>; testPath?: string }
) {
  return runCommand('node', args, options);
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
