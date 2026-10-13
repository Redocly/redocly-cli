import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, killServer, startServer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');
const consumerDir = join(__dirname, 'php-consumer');
const generatedFile = join(consumerDir, 'client/client.php');

const SERVER_PORT = 3109;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

const hasPhp = spawnSync('php', ['--version']).status === 0;

/** Run smoke.php against the mock server; `phpFlags` go in front, `smokeArgs` after the URL. */
function runSmoke(phpFlags: string[], smokeArgs: string[] = []): void {
  const result = spawnSync(
    'php',
    [...phpFlags, join(consumerDir, 'smoke.php'), SERVER_BASE, ...smokeArgs],
    { encoding: 'utf-8' }
  );
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain('PHP_SMOKE_OK');
}

describe('generate-client php generator (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;

  beforeAll(async () => {
    serverProcess = await startServer(
      join(__dirname, 'base-consumer/server.ts'),
      join(__dirname, 'base-consumer'),
      { BASE_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'php-smoke-server'
    );
  }, 60_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
    rmSync(join(consumerDir, 'client'), { recursive: true, force: true });
  });

  it('generates a self-contained client.php from the CLI', () => {
    generate(fixture, join(consumerDir, 'client/client.ts'), ['--generator', 'php']);
    expect(existsSync(generatedFile)).toBe(true);
  });

  it.skipIf(!hasPhp)('the generated client parses and declares (php -l + require)', () => {
    const lint = spawnSync('php', ['-l', generatedFile], { encoding: 'utf-8' });
    expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
    const declare = spawnSync('php', ['-r', `require '${generatedFile}'; echo 'DECLARED';`], {
      encoding: 'utf-8',
    });
    expect(declare.status, `${declare.stdout}\n${declare.stderr}`).toBe(0);
  });

  it.skipIf(!hasPhp)('the smoke runs real HTTP: hydration, bodies, ApiError', () => {
    runSmoke([]);
  });

  it.skipIf(!hasPhp)('the smoke still passes when OPcache has preloaded the client', () => {
    // opcache.preload keeps classes and functions in shared memory but drops file-level
    // constants, and the autoloader never includes the file again once Client exists.
    // The smoke checks that the preload really happened, so this cannot pass vacuously.
    runSmoke(
      ['-d', 'opcache.enable_cli=1', '-d', `opcache.preload=${join(consumerDir, 'preload.php')}`],
      ['preloaded']
    );
  });
});

describe('generate-client php generator, parameter names an SDK cannot take literally', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'php-repeated-'));
    generate(join(__dirname, 'fixtures/repeated-params.yaml'), join(dir, 'client.ts'), [
      '--generator',
      'php',
    ]);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('renames the repeat, keeps the wire name, and still parses', () => {
    const source = readFileSync(join(dir, 'client.php'), 'utf-8');
    // `id` in the path and in the query: PHP rejects a redefined parameter outright.
    expect(source).toContain('public function getThing(string $id, ?int $id2 = null');
    // A parameter named after one of the signature's own arguments moves aside too.
    expect(source).toContain('public function makeThing(string $body2, string $ctx, Thing $body');
    // The request is unchanged: the query keys keep the wire names.
    expect(source).toContain("$query['id'] = $id2;");
  });

  it.skipIf(!hasPhp)('the generated client parses (php -l)', () => {
    const lint = spawnSync('php', ['-l', join(dir, 'client.php')], { encoding: 'utf-8' });
    expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
  });
});
