// Helpers for the tests of the `generate-client` and `eject-generator` commands. They run the
// CLI and tsx scripts through the shared runners in tests/e2e/helpers.ts.
import { cpSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommandResult, runCommandResultAsync, type CommandResult } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');

/**
 * Run the redocly CLI. The default cwd is this folder, which has no redocly.yaml, so a local
 * redocly.yaml in the repository root does not change the result.
 */
export function runCli(args: string[], cwd: string = __dirname): CommandResult {
  return runCommandResult('node', [cliEntry, ...args], { testPath: cwd });
}

export function runGenerateClient(args: string[], cwd: string = __dirname): CommandResult {
  return runCli(['generate-client', ...args], cwd);
}

/** Run a tsx script. The script has its own timeout, because a hang must fail. */
export function runTsx(
  script: string,
  args: string[] = [],
  options: { cwd?: string; env?: Record<string, string> } = {}
): Promise<CommandResult> {
  return runCommandResultAsync(tsxBin, [script, ...args], {
    testPath: options.cwd ?? repoRoot,
    env: options.env,
    timeout: 60_000,
  });
}

/** Copy a consumer folder into a temp dir; the caller removes it. */
export function copyConsumer(consumerDir: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${basename(dirname(consumerDir))}-consumer-`));
  cpSync(consumerDir, dir, { recursive: true });
  symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return dir;
}
