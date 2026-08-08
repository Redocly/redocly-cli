import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, killServer, startServer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');
const consumerDir = join(__dirname, 'go-consumer');
const generatedFile = join(consumerDir, 'client/client.go');

const SERVER_PORT = 3107;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

const hasGo = spawnSync('go', ['version']).status === 0;

describe('generate-client go generator (end-to-end)', () => {
  afterAll(() => {
    rmSync(join(consumerDir, 'client'), { recursive: true, force: true });
    rmSync(join(consumerDir, 'smoke'), { force: true });
    rmSync(join(consumerDir, 'renamed-package'), { recursive: true, force: true });
  });

  it('generates a self-contained client.go from the CLI', () => {
    generate(fixture, join(consumerDir, 'client/client.ts'), ['--generator', 'go']);
    expect(existsSync(generatedFile)).toBe(true);
  });

  it('--go-package sets the package clause', () => {
    const target = join(consumerDir, 'renamed-package');
    generate(fixture, join(target, 'client.ts'), ['--generator', 'go', '--go-package', 'rebilly']);
    expect(readFileSync(join(target, 'client.go'), 'utf-8')).toContain('\npackage rebilly\n');
  });

  it.skipIf(!hasGo)(
    'the generated client compiles (go build)',
    () => {
      const result = spawnSync('go', ['build', '-o', 'smoke', '.'], {
        cwd: consumerDir,
        encoding: 'utf-8',
      });
      expect(result.status, result.stderr).toBe(0);
    },
    // The first build on a cold CI cache compiles the stdlib and takes well over
    // the 5s default.
    180_000
  );

  it.skipIf(!hasGo)(
    'the compiled smoke runs real HTTP: hydration, bodies, APIError',
    async () => {
      let serverProcess: ChildProcess | undefined;
      try {
        serverProcess = await startServer(
          join(__dirname, 'base-consumer/server.ts'),
          join(__dirname, 'base-consumer'),
          { BASE_SERVER_PORT: String(SERVER_PORT) },
          SERVER_BASE,
          'go-smoke-server'
        );
        const result = spawnSync(join(consumerDir, 'smoke'), [SERVER_BASE], {
          encoding: 'utf-8',
        });
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('GO_SMOKE_OK');
      } finally {
        if (serverProcess) await killServer(serverProcess);
      }
    },
    60_000
  );
});
