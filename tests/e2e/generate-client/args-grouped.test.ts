/**
 * E2E for `--args-style grouped`: every operation takes a single `vars:
 * <Op>Variables` object bundling its inputs (path params, query `params`, `body`,
 * header `headers`) instead of positional arguments, while the per-call request
 * `init` stays a separate trailing argument.
 *
 * The generated single file must compile under strict `tsc` with
 * `--noUnusedLocals`, which proves the `vars.*` member references line up with
 * the `<Op>Variables` aliases. Uses cafe.yaml because it exercises path params,
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

  test('emits a single `vars` object per operation with the inputs as members', () => {
    const result = spawnSync(
      'node',
      [cliEntry, 'generate-client', fixture, '--output', entry, '--args-style', 'grouped'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);
    expect(existsSync(entry)).toBe(true);

    const src = readFileSync(entry, 'utf-8');

    // getOrderById has a single `orderId` path param: grouped mode bundles it into
    // a required `vars: GetOrderByIdVariables` and reads it back as `vars.orderId`.
    expect(src).toContain('export async function getOrderById(vars: GetOrderByIdVariables,');
    expect(src).toContain('${encodeURIComponent(String(vars.orderId))}');

    // The per-call `init` stays a separate trailing argument (not folded into vars).
    expect(src).toContain('init: RequestOptions = {})');

    // No positional `orderId: string` argument leaks through in grouped mode.
    expect(src).not.toContain('getOrderById(orderId: string');
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
