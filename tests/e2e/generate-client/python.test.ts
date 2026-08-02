import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, killServer, startServer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');
const consumerDir = join(__dirname, 'python-consumer');
const generatedFile = join(consumerDir, 'client.py');

const SERVER_PORT = 3106;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;

describe('generate-client python generator (end-to-end)', () => {
  afterAll(() => {
    rmSync(generatedFile, { force: true });
    rmSync(join(consumerDir, '__pycache__'), { recursive: true, force: true });
  });

  it('generates a self-contained client.py from the CLI', () => {
    generate(fixture, join(consumerDir, 'client.ts'), ['--generator', 'python']);
    expect(existsSync(generatedFile)).toBe(true);
  });

  it.skipIf(!hasPython)('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', generatedFile], {
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it.skipIf(!hasHttpx)(
    'runs real HTTP against the mock server: hydration, bodies, ApiError',
    async () => {
      let serverProcess: ChildProcess | undefined;
      try {
        serverProcess = await startServer(
          join(__dirname, 'base-consumer/server.ts'),
          join(__dirname, 'base-consumer'),
          { BASE_SERVER_PORT: String(SERVER_PORT) },
          SERVER_BASE,
          'python-smoke-server'
        );
        const result = spawnSync(
          'python3',
          [join(consumerDir, 'smoke.py'), generatedFile, SERVER_BASE],
          { encoding: 'utf-8' }
        );
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('PYTHON_SMOKE_OK');
      } finally {
        if (serverProcess) await killServer(serverProcess);
      }
    },
    60_000
  );
});
