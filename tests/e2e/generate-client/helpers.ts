import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
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

/** Write a strict tsconfig into `dir` and type-check it; throws with the tsc output on failure. */
export function strictTypecheck(dir: string, include: string[] = ['**/*.ts']): void {
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({ ...STRICT_TSCONFIG, include }),
    'utf-8'
  );
  const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
  if (tsc.status !== 0) throw new Error(`tsc failed:\n${tsc.stdout}\n${tsc.stderr}`);
}

/** Write `dir/consumer.ts` and run it with tsx; returns its parsed JSON stdout. */
export function runConsumer(dir: string, script: string): unknown {
  writeFileSync(join(dir, 'consumer.ts'), script, 'utf-8');
  const result = spawnSync(tsxBin, [join(dir, 'consumer.ts')], {
    encoding: 'utf-8',
    cwd: repoRoot,
  });
  if (result.status !== 0) {
    throw new Error(`consumer failed:\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
  }
  return JSON.parse(result.stdout.trim());
}

/**
 * Spawn a consumer mock server (a tsx script exposing `GET /__test__/ready`) and wait
 * until it answers. The caller owns the returned process — stop it with `killServer`.
 */
export async function startServer(
  serverScript: string,
  cwd: string,
  env: Record<string, string>,
  baseUrl: string,
  label: string
): Promise<ChildProcess> {
  const server = spawn('npx', ['tsx', serverScript], {
    cwd,
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
