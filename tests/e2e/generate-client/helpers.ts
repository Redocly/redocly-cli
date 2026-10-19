// A copy of the helpers in packages/client-generator/tests/helpers/helpers.ts, trimmed and
// simplified to what the tests of the `generate-client` and `eject-generator` commands use.
import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');

/**
 * Run the redocly CLI. The default cwd is this folder, which has no redocly.yaml, so a local
 * redocly.yaml in the repository root does not change the result. `NODE_ENV=test` turns off
 * the update notifier, and the color variables keep the output plain.
 */
export function runCli(args: string[], cwd: string = __dirname): SpawnSyncReturns<string> {
  return spawnSync('node', [cliEntry, ...args], {
    encoding: 'utf-8',
    cwd,
    env: { ...process.env, NODE_ENV: 'test', NO_COLOR: 'TRUE', FORCE_COLOR: '0' },
  });
}

export function runGenerateClient(
  args: string[],
  cwd: string = __dirname
): SpawnSyncReturns<string> {
  return runCli(['generate-client', ...args], cwd);
}

type CommandResult = { status: number | null; stdout: string; stderr: string };

/** Run a tsx script. The script has its own timeout, because a hang must fail. */
export function runTsx(
  script: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<CommandResult> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(tsxBin, [script, ...args], {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      timeout: 60_000,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf-8');
    });
    child.on('error', rejectResult);
    child.on('close', (status) => resolveResult({ status, stdout, stderr }));
  });
}

/** Copy a consumer folder into a temp dir; the caller removes it. */
export function copyConsumer(consumerDir: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${basename(dirname(consumerDir))}-consumer-`));
  cpSync(consumerDir, dir, { recursive: true });
  symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return dir;
}
