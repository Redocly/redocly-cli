import { spawn, spawnSync, type ChildProcess, type SpawnSyncReturns } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(__dirname, '../../..');
export const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
export const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');
export const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

export const STRICT_TSCONFIG = {
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

/** Run `generate-client` on a fixture; throws with the CLI's stderr on failure. */
export function generate(fixture: string, outFile: string, extraArgs: string[] = []): void {
  const result = spawnSync(
    'node',
    [cliEntry, 'generate-client', fixture, '--output', outFile, ...extraArgs],
    { encoding: 'utf-8', cwd: repoRoot }
  );
  if (result.status !== 0) throw new Error(`generate-client failed:\n${result.stderr}`);
}

/**
 * Generate `dir/client.ts` from a fixture and mark the dir as an ES module so `tsx`
 * can run consumer scripts written next to it. Returns the generated entry path.
 */
export function generateInto(dir: string, fixture: string, extraArgs: string[] = []): string {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  const outFile = join(dir, 'client.ts');
  generate(fixture, outFile, extraArgs);
  return outFile;
}

export function runGenerateClient(
  args: string[],
  cwd: string = repoRoot
): SpawnSyncReturns<string> {
  return spawnSync('node', [cliEntry, 'generate-client', ...args], { encoding: 'utf-8', cwd });
}

export function runTsc(args: string[], cwd: string = repoRoot): SpawnSyncReturns<string> {
  return spawnSync(tscBin, args, { encoding: 'utf-8', cwd });
}

export function expectTscPasses(args: string[], cwd: string = repoRoot): void {
  const tsc = runTsc(args, cwd);
  expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
}

/** Write a strict tsconfig into `dir` and assert that it type-checks. */
export function strictTypecheck(dir: string, include: string[] = ['**/*.ts']): void {
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({ ...STRICT_TSCONFIG, include }),
    'utf-8'
  );
  expectTscPasses(['--noEmit', '-p', dir]);
}

/** A synchronous spawn ignores the test timeout, so the script has its own. */
export function runTsx(
  script: string,
  args: string[] = [],
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}
): SpawnSyncReturns<string> {
  return spawnSync(tsxBin, [script, ...args], {
    encoding: 'utf-8',
    cwd: options.cwd ?? repoRoot,
    env: options.env ?? process.env,
    timeout: 60_000,
  });
}

/** Write `dir/consumer.ts` and run it with tsx; returns its parsed JSON stdout. */
export function runConsumer(dir: string, script: string): unknown {
  writeFileSync(join(dir, 'consumer.ts'), script, 'utf-8');
  const result = runTsx(join(dir, 'consumer.ts'));
  expect(
    result.status,
    `consumer failed:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  ).toBe(0);
  return JSON.parse(result.stdout.trim());
}

export function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      files.push(...collectTsFiles(path));
    } else if (name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

export function linkNodeModules(dir: string): void {
  symlinkSync(join(repoRoot, 'node_modules'), join(dir, 'node_modules'), 'dir');
}

/** Copy a consumer folder into a temp dir; the caller removes it. */
export function copyConsumer(name: string): string {
  const dir = mkdtempSync(join(tmpdir(), `${name}-`));
  cpSync(join(__dirname, name), dir, { recursive: true });
  linkNodeModules(dir);
  return dir;
}

/** Start `servers/<name>.ts` and wait until it answers. Stop it with `killServer`. */
export async function startServer(
  name: string,
  env: Record<string, string>,
  baseUrl: string
): Promise<ChildProcess> {
  const serverScript = join(__dirname, 'servers', `${name}.ts`);
  const label = `${name} server`;
  const server = spawn(tsxBin, [serverScript], {
    cwd: join(__dirname, 'servers'),
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[${label} stderr] ${chunk.toString()}`);
  });
  await waitForServerReady(baseUrl, 15_000, label);
  return server;
}

export async function waitForServerReady(
  baseUrl: string,
  timeoutMs: number,
  label: string
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/__test__/ready`);
      if (response.ok) return;
      lastError = `readiness probe returned HTTP ${response.status}`;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveFn) => setTimeout(resolveFn, 100));
  }
  throw new Error(
    `${label} did not become ready within ${timeoutMs}ms: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Read a test server's request log. The fetch itself retries: a loaded machine (the
 * generator suite compiles Go, PHP, and TypeScript in parallel) occasionally resets a
 * connection to the local server, which says nothing about the client under test.
 */
export async function serverLog<T = Array<Record<string, unknown>>>(baseUrl: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/__test__/log`);
      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      await new Promise((resolveFn) => setTimeout(resolveFn, 100));
    }
  }
  throw lastError;
}

export function killServer(server: ChildProcess): Promise<void> {
  return new Promise((resolveFn) => {
    if (!server.pid || server.exitCode !== null) {
      resolveFn();
      return;
    }
    const onExit = (): void => resolveFn();
    server.once('exit', onExit);
    server.kill('SIGTERM');
    setTimeout(() => {
      server.removeListener('exit', onExit);
      if (server.exitCode === null) {
        server.kill('SIGKILL');
      }
      resolveFn();
    }, 2_000);
  });
}
