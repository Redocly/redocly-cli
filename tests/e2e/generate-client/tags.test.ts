/**
 * E2E for `--output-mode tags`: shared http + schemas, one endpoints file per
 * OpenAPI tag, and a barrel entry. The whole generated set must compile under
 * strict `tsc` with `--noUnusedLocals` (proves cross-file imports resolve and
 * each per-tag file imports exactly what it uses).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/cafe.yaml');

describe('generate-client end-to-end (--output-mode tags)', () => {
  let workDir = '';
  let entry = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'tags-client-'));
    entry = join(workDir, 'client.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  test('writes shared files, one file per tag, and the barrel entry', () => {
    const result = spawnSync(
      'node',
      [cliEntry, 'generate-client', fixture, '--output', entry, '--output-mode', 'tags'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);

    for (const name of [
      'client.ts',
      'client.http.ts',
      'client.schemas.ts',
      'Products.ts',
      'Orders.ts',
    ]) {
      expect(existsSync(join(workDir, name)), `expected ${name}`).toBe(true);
    }

    // Products operations live in Products.ts (first-tag assignment), not the barrel.
    expect(readFileSync(join(workDir, 'Products.ts'), 'utf-8')).toContain(
      'export async function listMenuItems('
    );
    const entrySrc = readFileSync(entry, 'utf-8');
    expect(entrySrc).toContain("export * from './Products.js';");
    expect(entrySrc).toContain("export * from './Orders.js';");
  }, 90_000);

  test('the whole generated set type-checks under strict mode with no unused imports', () => {
    expect(existsSync(entry), 'generation test must run first').toBe(true);

    const tsFiles = readdirSync(workDir)
      .filter((name) => name.endsWith('.ts'))
      .map((name) => join(workDir, name));

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
        ...tsFiles,
      ],
      { encoding: 'utf-8', cwd: workDir }
    );
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});
