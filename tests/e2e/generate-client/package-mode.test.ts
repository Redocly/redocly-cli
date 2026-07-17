import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { cliEntry, generate, killServer, repoRoot, startServer } from './helpers.js';

// The `runtime: package` output: instead of inlining the runtime, the generated
// client imports `createClient` from `@redocly/client-generator` (resolved through
// the workspace's own node_modules symlink — the spec's symlinked-consumer setup).
// The programmatic tests below exercise the API of the BUILT package; the CLI test
// exercises the `--runtime` flag wired in stage ③a.

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatorLib = join(repoRoot, 'packages/client-generator/lib/index.js');
const fixture = join(__dirname, 'fixtures/package-runtime.yaml');
const consumerDir = join(__dirname, 'package-runtime-consumer');
const generatedFile = join(consumerDir, 'api.ts');
const serverScript = join(consumerDir, 'server.ts');
const indexScript = join(consumerDir, 'index.ts');

const SERVER_PORT = 3123;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

type GenerateClient = (options: Record<string, unknown>) => Promise<unknown>;

async function loadGenerateClient(): Promise<GenerateClient> {
  const mod = (await import(pathToFileURL(generatorLib).href)) as {
    generateClient: GenerateClient;
  };
  return mod.generateClient;
}

describe('generate-client package-runtime consumer', () => {
  let serverProcess: ChildProcess | undefined;

  beforeAll(async () => {
    if (existsSync(generatedFile)) {
      rmSync(generatedFile, { force: true });
    }

    serverProcess = await startServer(
      serverScript,
      consumerDir,
      { PKG_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'package-runtime-server'
    );
  }, 30_000);

  afterAll(async () => {
    if (serverProcess) {
      await killServer(serverProcess);
    }
  });

  test('end-to-end: generate package-mode client, type-check, run, assert wire behavior', async () => {
    const generateClient = await loadGenerateClient();
    await generateClient({ api: fixture, output: generatedFile, runtime: 'package' });

    expect(existsSync(generatedFile)).toBe(true);
    const generated = readFileSync(generatedFile, 'utf-8');
    // Imports the runtime instead of inlining it.
    expect(generated).toContain("from '@redocly/client-generator'");
    expect(generated).not.toContain('__send');
    expect(generated).not.toContain('let BASE');
    // The skew guard and the wire-name descriptor for the non-identifier path param.
    expect(generated).toContain('as const satisfies Record<string, OperationDescriptor>;');
    expect(generated).toContain('{ name: "order-id", in: "path" }');
    // The colliding operationId is renamed; its descriptor id stays the spec id.
    expect(generated).toContain('configure_2: { id: "configure"');

    // Type gate: the consumer (incl. the generated file) compiles strict against the
    // BUILT package types — this is the `satisfies` version-skew guard in action.
    const typecheckResult = spawnSync('npx', ['tsc', '--noEmit', '-p', consumerDir], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(
      typecheckResult.status,
      `tsc --noEmit failed:\nstdout:\n${typecheckResult.stdout}\nstderr:\n${typecheckResult.stderr}`
    ).toBe(0);

    const runResult = spawnSync('npx', ['tsx', indexScript], {
      encoding: 'utf-8',
      cwd: consumerDir,
    });
    expect(
      runResult.status,
      `consumer stdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
    ).toBe(0);
    const parsed = JSON.parse(runResult.stdout.trim()) as {
      order: { id: string; status: string };
      grouped: { id: string };
      created: { id: string; status: string };
      collided: string;
      events: Array<{ seq: number; text?: string }>;
      middlewareIds: string[];
    };
    expect(parsed.order).toEqual({ id: 'o-1', status: 'open' });
    expect(parsed.grouped.id).toBe('o-2');
    expect(parsed.created).toEqual({ id: 'created-1', status: 'open' });
    expect(parsed.collided).toBe('ok');
    expect(parsed.events).toEqual([
      { seq: 1, text: 'a' },
      { seq: 2, text: 'b' },
    ]);
    // Middleware targets the SPEC operationId — including the renamed `configure` op.
    expect(parsed.middlewareIds).toEqual([
      'getOrder',
      'getOrder',
      'createOrder',
      'configure',
      'streamEvents',
    ]);

    const logResponse = await fetch(`${SERVER_BASE}/__test__/log`);
    const log = (await logResponse.json()) as Array<{
      method: string;
      url: string;
      auth: string | null;
    }>;
    // Wire-name path substitution + query serialization + injected bearer.
    expect(log).toContainEqual({
      method: 'GET',
      url: '/orders/o-1?expand=items',
      auth: 'Bearer test-token',
    });
    expect(log).toContainEqual({ method: 'GET', url: '/orders/o-2', auth: 'Bearer test-token' });
    // Unsecured operations carry no credential.
    expect(log).toContainEqual({ method: 'POST', url: '/orders', auth: null });
    expect(log).toContainEqual({ method: 'GET', url: '/configure-op', auth: null });
    expect(log).toContainEqual({ method: 'GET', url: '/events', auth: null });
  }, 60_000);

  test('package mode composes with split output and the tanstack-query generator', async () => {
    const generateClient = await loadGenerateClient();
    const tmpDir = mkdtempSync(join(tmpdir(), 'ots-package-combos-'));
    try {
      // split: the entry re-exports a sibling schemas module, both in package mode.
      const splitEntry = join(tmpDir, 'api.ts');
      await generateClient({
        api: fixture,
        output: splitEntry,
        runtime: 'package',
        outputMode: 'split',
      });
      expect(existsSync(splitEntry)).toBe(true);
      expect(readFileSync(splitEntry, 'utf-8')).toContain("from '@redocly/client-generator'");
      const splitSchemas = join(tmpDir, 'api.schemas.ts');
      expect(existsSync(splitSchemas)).toBe(true);
      expect(readFileSync(splitSchemas, 'utf-8')).toContain('export type Order =');

      // tanstack-query + package: the client plus the tanstack wrapper module.
      const tanstackDir = join(tmpDir, 'tanstack');
      const tanstackEntry = join(tanstackDir, 'api.ts');
      await generateClient({
        api: fixture,
        output: tanstackEntry,
        runtime: 'package',
        generators: ['sdk', 'tanstack-query'],
        queryFramework: 'react',
      });
      expect(existsSync(tanstackEntry)).toBe(true);
      expect(readFileSync(tanstackEntry, 'utf-8')).toContain("from '@redocly/client-generator'");
      const tanstackWrapper = join(tanstackDir, 'api.tanstack.ts');
      expect(existsSync(tanstackWrapper)).toBe(true);
      expect(readFileSync(tanstackWrapper, 'utf-8')).toContain('queryOptions');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }, 30_000);

  test('CLI --runtime package emits a runtime import', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'ots-cli-runtime-'));
    const output = join(tmpDir, 'cli.ts');
    generate(fixture, output, ['--runtime', 'package']);
    const generated = readFileSync(output, 'utf-8');
    expect(generated).toContain("from '@redocly/client-generator'");
    expect(generated).not.toContain('__send');
    rmSync(tmpDir, { recursive: true, force: true });
  }, 30_000);

  test('CLI --runtime rejects an unknown value', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'ots-cli-runtime-bogus-'));
    const output = join(tmpDir, 'cli.ts');
    const result = spawnSync(
      'node',
      [cliEntry, 'generate-client', fixture, '--output', output, '--runtime', 'bogus'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Invalid values');
    expect(existsSync(output)).toBe(false);
    rmSync(tmpDir, { recursive: true, force: true });
  }, 30_000);
});
