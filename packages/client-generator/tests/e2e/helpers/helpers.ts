import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '../../../../..');
export const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

const STRICT_TSCONFIG = {
  compilerOptions: {
    module: 'nodenext',
    moduleResolution: 'nodenext',
    target: 'es2022',
    lib: ['ES2022', 'DOM'],
    strict: true,
    noUnusedLocals: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
};

export function runTsc(args: string[], cwd: string = repoRoot): SpawnSyncReturns<string> {
  return spawnSync(tscBin, args, { encoding: 'utf-8', cwd });
}

export function expectTscPasses(args: string[], cwd: string = repoRoot): void {
  const tsc = runTsc(args, cwd);
  expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
}

/** Write the shared strict tsconfig into `dir`, checking only the `include` files. */
export function writeStrictTsconfig(dir: string, include: string[] = ['**/*.ts']): void {
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({ ...STRICT_TSCONFIG, include }),
    'utf-8'
  );
}

/** Write the shared strict tsconfig into `dir` and assert that it type-checks. */
export function strictTypecheck(dir: string, include: string[] = ['**/*.ts']): void {
  writeStrictTsconfig(dir, include);
  expectTscPasses(['--noEmit', '-p', dir]);
}

type CommandResult = { status: number | null; stdout: string; stderr: string };

/**
 * Run a command without blocking the test process, so a mock server in this process can
 * answer the command's requests. The command has its own timeout, because a hang must fail.
 */
export function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; timeout?: number } = {}
): Promise<CommandResult> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      timeout: options.timeout ?? 60_000,
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

export function runTsx(
  script: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): Promise<CommandResult> {
  return runCommand(tsxBin, [script, ...args], options);
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

function linkNodeModules(dir: string): void {
  symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
}

/** Copy a consumer folder into a temp dir; the caller removes it. */
export function copyConsumer(consumerDir: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${basename(dirname(consumerDir))}-consumer-`));
  cpSync(consumerDir, dir, { recursive: true });
  linkNodeModules(dir);
  return dir;
}
