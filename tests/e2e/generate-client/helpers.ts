// A copy of the helpers in packages/client-generator/tests/helpers/helpers.ts, trimmed to
// what the tests of the `generate-client` and `eject-generator` commands use.
import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '../../..');
export const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

const STRICT_TSCONFIG = {
  compilerOptions: {
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'es2022',
    lib: ['ES2022', 'DOM'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
};

export function runGenerateClient(
  args: string[],
  cwd: string = repoRoot
): SpawnSyncReturns<string> {
  return spawnSync('node', [cliEntry, 'generate-client', ...args], { encoding: 'utf-8', cwd });
}

export function runTsc(args: string[], cwd: string = repoRoot): SpawnSyncReturns<string> {
  return spawnSync(tscBin, args, { encoding: 'utf-8', cwd });
}

/** Write the shared strict tsconfig into `dir` and assert that it type-checks. */
export function strictTypecheck(dir: string, include: string[] = ['**/*.ts']): void {
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({ ...STRICT_TSCONFIG, include }),
    'utf-8'
  );
  const tsc = runTsc(['--noEmit', '-p', dir]);
  expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
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

/** Run a consumer script with tsx; returns its parsed JSON stdout. */
export async function runConsumer(script: string): Promise<unknown> {
  const result = await runTsx(script);
  expect(
    result.status,
    `consumer failed:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  ).toBe(0);
  return JSON.parse(result.stdout.trim());
}

/** Copy a consumer folder into a temp dir; the caller removes it. */
export function copyConsumer(consumerDir: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${basename(dirname(consumerDir))}-consumer-`));
  cpSync(consumerDir, dir, { recursive: true });
  symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
  return dir;
}
