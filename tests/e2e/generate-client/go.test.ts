import { type ChildProcess, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, generate, killServer, startServer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');
let workDir = '';
let generatedFile = '';

const SERVER_PORT = 3107;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

describe('generate-client go generator (end-to-end)', () => {
  beforeAll(() => {
    workDir = copyConsumer('go-consumer');
    generatedFile = join(workDir, 'client/client.go');
    generate(fixture, join(workDir, 'client/client.ts'), ['--generator', 'go']);
    expect(existsSync(generatedFile)).toBe(true);
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('the generated client is gofmt-clean', () => {
    const result = spawnSync('gofmt', ['-l', generatedFile], { encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout, 'files gofmt would change').toBe('');
  });

  it('--go-package sets the package clause', () => {
    const target = join(workDir, 'renamed-package');
    generate(fixture, join(target, 'client.ts'), ['--generator', 'go', '--go-package', 'rebilly']);
    expect(readFileSync(join(target, 'client.go'), 'utf-8')).toContain('\npackage rebilly\n');
  });

  it(
    'the generated client compiles (go build)',
    () => {
      const result = spawnSync('go', ['build', '-o', 'smoke', '.'], {
        cwd: workDir,
        encoding: 'utf-8',
      });
      expect(result.status, result.stderr).toBe(0);
    },
    // The first build on a cold CI cache compiles the stdlib and takes well over
    // the 5s default.
    180_000
  );

  it('the compiled smoke runs real HTTP: hydration, bodies, APIError', async () => {
    let serverProcess: ChildProcess | undefined;
    try {
      serverProcess = await startServer(
        'base',
        { BASE_SERVER_PORT: String(SERVER_PORT) },
        SERVER_BASE
      );
      const result = spawnSync(join(workDir, 'smoke'), [SERVER_BASE], {
        encoding: 'utf-8',
      });
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain('GO_SMOKE_OK');
    } finally {
      if (serverProcess) await killServer(serverProcess);
    }
  }, 60_000);
});

describe('generate-client go generator, parameter names an SDK cannot take literally', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'go-repeated-'));
    generate(join(__dirname, 'fixtures/repeated-params.yaml'), join(dir, 'client.ts'), [
      '--generator',
      'go',
    ]);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('renames a parameter that clashes with one of the method arguments', () => {
    const source = readFileSync(join(dir, 'client.go'), 'utf-8');
    // Query params live in their own struct, so `id` needs no rename here…
    expect(source).toContain('func (c *Client) GetThing(ctx context.Context, id string');
    // …but a path parameter named after an argument the method declares itself does.
    expect(source).toContain(
      'func (c *Client) MakeThing(ctx context.Context, body2 string, ctx2 string, body Thing'
    );
  });

  it('the generated client compiles (go build)', () => {
    writeFileSync(join(dir, 'go.mod'), 'module repeatedparams\n\ngo 1.21\n', 'utf-8');
    const result = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  }, 180_000);
});
