// The generator compatibility contract: an incompatible `--generator` selection must
// fail fast with an actionable message (never emit a client that won't compile), and
// `tanstack-query` must gracefully skip SSE operations (which the sdk doesn't export).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { cliEntry, repoRoot, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cafe = join(__dirname, 'fixtures', 'cafe.yaml');
const sse = join(__dirname, 'fixtures', 'sse.yaml');

function run(args: string[]): { status: number | null; out: string } {
  const res = spawnSync('node', [cliEntry, 'generate-client', ...args], {
    encoding: 'utf-8',
    cwd: repoRoot,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

describe('generate-client generator compatibility contract', () => {
  it('rejects tanstack-query without sdk, naming the fix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-contract-'));
    const { status, out } = run([
      cafe,
      '--output',
      join(dir, 'c.ts'),
      '--generator',
      'tanstack-query',
    ]);
    expect(status).not.toBe(0);
    expect(out).toMatch(/requires the "sdk" generator/);
    expect(out).toMatch(/--generator sdk --generator tanstack-query/);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('rejects tanstack-query with result error mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-contract-'));
    const { status, out } = run([
      cafe,
      '--output',
      join(dir, 'c.ts'),
      '--generator',
      'sdk',
      '--generator',
      'tanstack-query',
      '--error-mode',
      'result',
    ]);
    expect(status).not.toBe(0);
    expect(out).toMatch(/does not support --error-mode "result"/);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('rejects transformers without --date-type Date', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-contract-'));
    const { status, out } = run([
      cafe,
      '--output',
      join(dir, 'c.ts'),
      '--generator',
      'sdk',
      '--generator',
      'transformers',
    ]);
    expect(status).not.toBe(0);
    expect(out).toMatch(/requires --date-type Date/);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('defaults to the sdk client when no --generator is passed', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-contract-'));
    const outFile = join(dir, 'c.ts');
    // With no `--generator` flag the selection is unset, so it falls back to the default
    // sdk generator and emits a client rather than silently producing nothing.
    const { status, out } = run([cafe, '--output', outFile]);
    expect(status, out).toBe(0);
    expect(existsSync(outFile)).toBe(true);
    expect(readFileSync(outFile, 'utf-8')).toContain('export const client = createClient<Ops,');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('skips SSE operations in tanstack-query (reporting them) and still emits the rest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-contract-'));
    const { status, out } = run([
      sse,
      '--output',
      join(dir, 'c.ts'),
      '--generator',
      'sdk',
      '--generator',
      'tanstack-query',
    ]);
    expect(status, out).toBe(0);
    expect(out).toMatch(/tanstack-query skipped \d+ server-sent-events operation/);
    const tanstack = readFileSync(join(dir, 'c.tanstack.ts'), 'utf-8');
    // The non-SSE op is wrapped; the SSE ops are neither imported nor wrapped.
    expect(tanstack).toContain('getHealthOptions');
    expect(tanstack).not.toContain('streamMessages');
    expect(existsSync(join(dir, 'c.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('skips a tanstack op whose <Op>Variables collides with a schema; the tree still compiles', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-contract-'));
    // Schema `GetUserVariables` collides with the `getUser` op's derived variables alias.
    writeFileSync(
      join(dir, 'api.yaml'),
      outdent`
        openapi: 3.1.0
        info: { title: C, version: '1.0.0' }
        paths:
          /users/{id}:
            get:
              operationId: getUser
              parameters: [{ name: id, in: path, required: true, schema: { type: string } }]
              responses: { '200': { description: ok } }
          /users:
            get:
              operationId: listUsers
              responses: { '200': { description: ok } }
        components:
          schemas:
            GetUserVariables: { type: object, properties: { ready: { type: boolean } } }
      `,
      'utf-8'
    );
    const { status, out } = run([
      join(dir, 'api.yaml'),
      '--output',
      join(dir, 'c.ts'),
      '--generator',
      'sdk',
      '--generator',
      'tanstack-query',
    ]);
    expect(status, out).toBe(0);
    expect(out).toMatch(
      /tanstack-query skipped \d+ operation\(s\) whose variables type name collides/
    );
    const tanstack = readFileSync(join(dir, 'c.tanstack.ts'), 'utf-8');
    expect(tanstack).not.toContain('getUserOptions'); // colliding op skipped
    expect(tanstack).toContain('listUsersOptions'); // the rest still wrapped
    // The whole tree compiles (no import of the suppressed alias).
    const files = [join(dir, 'c.ts'), join(dir, 'c.tanstack.ts')];
    const tsc = spawnSync(
      tscBin,
      [
        '--noEmit',
        '--strict',
        '--target',
        'ES2020',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'ES2020,DOM',
        ...files,
      ],
      { encoding: 'utf-8', cwd: dir }
    );
    // `@tanstack/react-query` isn't installed in the temp dir; ignore only that missing-module error.
    const real = tsc.stdout
      .split('\n')
      .filter((l) => l.includes('error TS') && !l.includes('@tanstack/react-query'));
    expect(real, tsc.stdout).toEqual([]);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
