import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runCommand } from '../helpers/helpers.js';
import { MockServer } from '../helpers/mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');
let workDir = '';
let generatedFile = '';

describe('generate-client go generator (end-to-end)', () => {
  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer'));
    generatedFile = join(workDir, 'client/client.go');
    await generateClient({
      api: fixture,
      output: join(workDir, 'client/client.ts'),
      generators: ['go'],
    });
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

  it('--go-package sets the package clause', async () => {
    const target = join(workDir, 'renamed-package');
    await generateClient({
      api: fixture,
      output: join(target, 'client.ts'),
      generators: ['go'],
      goPackage: 'rebilly',
    });
    expect(readFileSync(join(target, 'client.go'), 'utf-8')).toContain('\npackage rebilly\n');
  });

  it(
    'the generated client compiles (go build) and the smoke runs real HTTP: hydration, bodies, APIError',
    async () => {
      const build = spawnSync('go', ['build', '-o', 'smoke', '.'], {
        cwd: workDir,
        encoding: 'utf-8',
      });
      expect(build.status, build.stderr).toBe(0);

      const server = await MockServer.start(fixture);
      try {
        const result = await runCommand(join(workDir, 'smoke'), [server.url]);
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('GO_SMOKE_OK');
        expect(server.handlerErrors).toEqual([]);
      } finally {
        await server.close();
      }
    },
    // The first build on a cold CI cache compiles the stdlib and takes well over
    // the 5s default.
    180_000
  );
});

describe('generate-client go generator, parameter names an SDK cannot take literally', () => {
  let dir: string;

  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer-repeated-params'));
    await generateClient({
      api: join(__dirname, '../fixtures/repeated-params.yaml'),
      output: join(dir, 'client.ts'),
      generators: ['go'],
    });
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
    const result = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  }, 180_000);
});
