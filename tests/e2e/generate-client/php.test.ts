import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
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

describe('generate-client php generator (end-to-end)', () => {
  afterAll(() => {
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

  it.skipIf(!hasPhp)(
    'the smoke runs real HTTP: hydration, bodies, ApiError',
    async () => {
      let serverProcess: ChildProcess | undefined;
      try {
        serverProcess = await startServer(
          join(__dirname, 'base-consumer/server.ts'),
          join(__dirname, 'base-consumer'),
          { BASE_SERVER_PORT: String(SERVER_PORT) },
          SERVER_BASE,
          'php-smoke-server'
        );
        const result = spawnSync('php', [join(consumerDir, 'smoke.php'), SERVER_BASE], {
          encoding: 'utf-8',
        });
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('PHP_SMOKE_OK');
      } finally {
        if (serverProcess) await killServer(serverProcess);
      }
    },
    60_000
  );
});
