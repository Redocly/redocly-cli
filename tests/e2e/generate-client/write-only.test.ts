// Behavioral e2e for write-only properties: each generated client registers a customer
// with a required write-only `password`, and the server answers without it, as the
// description says. The request must still carry the password, and the response must
// decode without it. The programs under write-only-consumer/ make the call and check the
// decoded response; the assertions here read what the server received.
import { spawnSync, type ChildProcess } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, killServer, repoRoot, serverLog, startServer, tsxBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/write-only.yaml');
const consumerDir = join(__dirname, 'write-only-consumer');
const generatedEntry = join(consumerDir, 'client/client.ts');

const SERVER_PORT = 3116;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;
const hasGo = spawnSync('go', ['version']).status === 0;
const hasPhp = spawnSync('php', ['--version']).status === 0;

/** Run one consumer program; it must exit 0 and print its `<LANG>_SMOKE_OK` marker. */
function runProgram(command: string, args: string[], marker: string, cwd = repoRoot): void {
  const result = spawnSync(command, args, { encoding: 'utf-8', cwd });
  expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  expect(result.stdout).toContain(marker);
}

/** The one request every client sends: the password travels, whatever else it adds. */
async function expectPasswordSent(): Promise<void> {
  expect(await serverLog(SERVER_BASE)).toEqual([
    {
      method: 'POST',
      url: '/customers',
      body: expect.objectContaining({ email: 'ada@example.com', password: 'correct horse' }),
    },
  ]);
}

describe('generate-client write-only properties (end-to-end)', () => {
  let serverProcess: ChildProcess;

  beforeAll(async () => {
    serverProcess = await startServer(
      join(consumerDir, 'server.ts'),
      consumerDir,
      { WRITE_ONLY_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'write-only-server'
    );
  }, 30_000);

  beforeEach(async () => {
    await fetch(`${SERVER_BASE}/__test__/reset`, { method: 'POST' });
  });

  afterAll(async () => {
    await killServer(serverProcess);
    rmSync(join(consumerDir, 'client'), { recursive: true, force: true });
  });

  it('TypeScript + zod: the response type and schema leave the password out', async () => {
    generate(fixture, generatedEntry, ['--generator', 'typescript', '--generator', 'zod']);
    // The consumer's typecheck proves the response type has no `password`.
    const typecheck = spawnSync('npx', ['tsc', '--noEmit', '-p', consumerDir], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(typecheck.status, `${typecheck.stdout}\n${typecheck.stderr}`).toBe(0);

    runProgram(tsxBin, [join(consumerDir, 'consumer.ts'), SERVER_BASE], 'TYPESCRIPT_SMOKE_OK');

    await expectPasswordSent();
  }, 60_000);

  it.skipIf(!hasHttpx)(
    'Python: a response without the password decodes',
    async () => {
      generate(fixture, generatedEntry, ['--generator', 'python']);

      runProgram('python3', [join(consumerDir, 'smoke.py'), SERVER_BASE], 'PYTHON_SMOKE_OK');

      await expectPasswordSent();
    },
    60_000
  );

  it.skipIf(!hasGo)(
    'Go: a response without the password leaves the field nil',
    async () => {
      generate(fixture, generatedEntry, ['--generator', 'go']);

      runProgram('go', ['run', '.', SERVER_BASE], 'GO_SMOKE_OK', consumerDir);

      await expectPasswordSent();
    },
    // The first build on a cold cache compiles the stdlib and takes well over 60s.
    180_000
  );

  it.skipIf(!hasPhp)(
    'PHP: a response without the password hydrates',
    async () => {
      generate(fixture, generatedEntry, ['--generator', 'php']);

      runProgram('php', [join(consumerDir, 'smoke.php'), SERVER_BASE], 'PHP_SMOKE_OK');

      await expectPasswordSent();
    },
    60_000
  );
});
