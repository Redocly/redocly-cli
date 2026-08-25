import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  generate,
  generateInto,
  killServer,
  runConsumer,
  startServer,
  strictTypecheck,
} from './helpers.js';

const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasGo = spawnSync('go', ['version']).status === 0;
const hasPhp = spawnSync('php', ['--version']).status === 0;

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');
const serverScript = join(__dirname, 'cafe-consumer/server.ts');

const SERVER_PORT = 3113;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client --runtime module (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;
  let dir = '';

  beforeAll(async () => {
    serverProcess = await startServer(
      serverScript,
      join(__dirname, 'cafe-consumer'),
      { CAFE_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'module-runtime-server'
    );
    dir = mkdtempSync(join(tmpdir(), 'module-runtime-'));
    generateInto(dir, fixture, ['--runtime', 'module', '--server-url', SERVER_BASE]);
  }, 120_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the per-needs runtime files and a client that imports them relatively', () => {
    // cafe needs auth — its multipart body is untyped (binary upload), no SSE,
    // no pagination, no setup — so only the core modules + auth are written.
    for (const name of [
      'types',
      'errors',
      'url',
      'parse',
      'retry',
      'auth',
      'send',
      'create-client',
      'factory',
    ]) {
      expect(existsSync(join(dir, 'runtime', `${name}.ts`)), name).toBe(true);
    }
    for (const name of ['multipart', 'sse', 'paginate', 'setup']) {
      expect(existsSync(join(dir, 'runtime', `${name}.ts`)), name).toBe(false);
    }
    const entry = readFileSync(join(dir, 'client.ts'), 'utf-8');
    expect(entry).toContain("import { createClient } from './runtime/factory.js';");
    expect(entry).toContain("export * from './runtime/factory.js';");
    expect(entry).not.toContain('// ─── Embedded runtime');
  });

  it('the client + runtime folder type-check strictly together', () => {
    strictTypecheck(dir);
  }, 120_000);

  it('a real request goes through the runtime files and returns typed data', () => {
    const results = runConsumer(
      dir,
      `import { ApiError, listMenuItems } from './client.js';
const items = await listMenuItems({});
console.log(JSON.stringify({ ok: Array.isArray(items.items), viaApiError: typeof ApiError }));
`
    ) as { ok: boolean; viaApiError: string };
    expect(results.ok).toBe(true);
    // The error class reaches the consumer through the factory re-export chain.
    expect(results.viaApiError).toBe('function');
  }, 120_000);
});

describe('generate-client --runtime module — language generators', () => {
  let dir = '';

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'module-runtime-lang-'));
    for (const generator of ['python', 'go', 'php']) {
      generate(fixture, join(dir, generator, 'client.ts'), [
        '--generator',
        generator,
        '--runtime',
        'module',
      ]);
    }
  }, 120_000);

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it.skipIf(!hasPython)('python: the client and every runtime module compile', () => {
    const files = readdirSync(join(dir, 'python')).filter((name) => name.endsWith('.py'));
    expect(files).toContain('_send.py');
    for (const name of files) {
      const result = spawnSync('python3', ['-m', 'py_compile', join(dir, 'python', name)], {
        encoding: 'utf-8',
      });
      expect(result.status, `${name}: ${result.stderr}`).toBe(0);
    }
    expect(readFileSync(join(dir, 'python', 'client.py'), 'utf-8')).toContain(
      'from _send import *'
    );
  });

  it.skipIf(!hasGo)(
    'go: the client and runtime.go build as one package',
    () => {
      writeFileSync(join(dir, 'go', 'go.mod'), 'module smoke.test\n\ngo 1.21\n', 'utf-8');
      const result = spawnSync('go', ['build', './...'], {
        cwd: join(dir, 'go'),
        encoding: 'utf-8',
      });
      expect(result.status, result.stderr).toBe(0);
    },
    // A cold CI cache compiles the stdlib on the first build.
    180_000
  );

  it.skipIf(!hasPhp)('php: both files parse and the client requires its runtime', () => {
    for (const name of ['client.php', 'runtime.php']) {
      const lint = spawnSync('php', ['-l', join(dir, 'php', name)], { encoding: 'utf-8' });
      expect(lint.status, lint.stdout + lint.stderr).toBe(0);
    }
    const declare = spawnSync(
      'php',
      ['-r', `require '${join(dir, 'php', 'client.php')}'; echo 'DECLARED';`],
      { encoding: 'utf-8' }
    );
    expect(declare.status, declare.stdout + declare.stderr).toBe(0);
    expect(declare.stdout).toContain('DECLARED');
  });
});
