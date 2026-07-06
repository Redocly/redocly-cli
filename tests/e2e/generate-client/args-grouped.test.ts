/**
 * E2E for `--args-style grouped`: instead of flat positional call sugar, the
 * operations are exported by destructuring the client (`export const { getOrderById,
 * ... } = client;`), so every operation takes the grouped args object (path params,
 * query `params`, `body`, header `headers`) with the per-call request `init` as a
 * separate trailing argument — the client method signature itself.
 *
 * The generated single file must compile under strict `tsc` with
 * `--noUnusedLocals`, which proves the grouped members line up with the
 * `<Op>Variables` aliases. Uses cafe.yaml because it exercises path params,
 * query params, request bodies, header params, and auth together.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/cafe.yaml');

describe('generate-client end-to-end (--args-style grouped)', () => {
  let workDir = '';
  let entry = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'args-grouped-client-'));
    entry = join(workDir, 'client.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  test('exports the operations by destructuring the client (grouped args = client methods)', () => {
    const result = spawnSync(
      'node',
      [cliEntry, 'generate-client', fixture, '--output', entry, '--args-style', 'grouped'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);
    expect(existsSync(entry)).toBe(true);

    const src = readFileSync(entry, 'utf-8');

    // Grouped mode re-exports the client methods directly — one destructure export.
    expect(src).toMatch(/export const \{ [^}]*getOrderById[^}]* \} = client;/);
    // The grouped `<Op>Variables` aliases are still emitted for consumers.
    expect(src).toContain('export type GetOrderByIdVariables = {');
    // getOrderById's grouped args carry the path param as a member in Ops.
    expect(src).toMatch(/getOrderById: \{\s*args: \{[\s\S]*?orderId: string;/);

    // No flat positional sugar leaks through in grouped mode.
    expect(src).not.toContain('export const getOrderById = (orderId: string');
  }, 90_000);

  test('the grouped-style client type-checks under strict mode with no unused locals', () => {
    expect(existsSync(entry), 'generation test must run first').toBe(true);

    const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
    const tsc = spawnSync(
      tscBin,
      [
        '--noEmit',
        '--strict',
        '--noUnusedLocals',
        '--target',
        'ES2020',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'ES2020,DOM',
        entry,
      ],
      { encoding: 'utf-8', cwd: workDir }
    );
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});
