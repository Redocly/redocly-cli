import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runCommand } from '../helpers.js';
import { MockServer } from '../mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');
let workDir = '';
let generatedFile = '';

let server: MockServer;

/** Run smoke.php against the mock server; `phpFlags` go in front, `smokeArgs` after the URL. */
async function runSmoke(phpFlags: string[], smokeArgs: string[] = []): Promise<void> {
  const result = await runCommand('php', [
    ...phpFlags,
    join(workDir, 'smoke.php'),
    server.url,
    ...smokeArgs,
  ]);
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain('PHP_SMOKE_OK');
}

describe('generate-client php generator (end-to-end)', () => {
  beforeAll(async () => {
    server = await MockServer.start(fixture);
    workDir = copyConsumer(join(__dirname, 'consumer'));
    generatedFile = join(workDir, 'client/client.php');
    await generateClient({
      api: fixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['php'],
    });
    expect(existsSync(generatedFile)).toBe(true);
  }, 60_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('the generated client parses and declares (php -l + require)', () => {
    const lint = spawnSync('php', ['-l', generatedFile], { encoding: 'utf-8' });
    expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
    const declare = spawnSync('php', ['-r', `require '${generatedFile}'; echo 'DECLARED';`], {
      encoding: 'utf-8',
    });
    expect(declare.status, `${declare.stdout}\n${declare.stderr}`).toBe(0);
  });

  it('the smoke runs real HTTP: hydration, bodies, ApiError', async () => {
    await runSmoke([]);
  });

  it('the smoke still passes when OPcache has preloaded the client', async () => {
    // opcache.preload keeps classes and functions in shared memory but drops file-level
    // constants, and the autoloader never includes the file again once Client exists.
    // The smoke checks that the preload really happened, so this cannot pass vacuously.
    await runSmoke(
      ['-d', 'opcache.enable_cli=1', '-d', `opcache.preload=${join(workDir, 'preload.php')}`],
      ['preloaded']
    );
  });
});

describe('generate-client php generator, parameter names an SDK cannot take literally', () => {
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'php-repeated-'));
    await generateClient({
      api: join(__dirname, '../fixtures/repeated-params.yaml'),
      output: join(dir, 'client.ts'),
      generators: ['php'],
    });
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

  it('the generated client parses (php -l)', () => {
    const lint = spawnSync('php', ['-l', join(dir, 'client.php')], { encoding: 'utf-8' });
    expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
  });
});
