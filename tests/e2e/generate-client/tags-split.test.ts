/**
 * E2E for `--output-mode tags-split`: a folder per OpenAPI tag with shared
 * http + schemas at the root. The whole generated tree must compile under strict
 * `tsc` with `--noUnusedLocals` (proves the `../` imports back to the shared
 * modules resolve and that each per-tag file imports exactly what it uses).
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

function collectTsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('generate-client end-to-end (--output-mode tags-split)', () => {
  let workDir = '';
  let entry = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'tags-split-client-'));
    entry = join(workDir, 'client.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  test('writes a folder per tag with shared modules at the root', () => {
    const result = spawnSync(
      'node',
      [cliEntry, 'generate-client', fixture, '--output', entry, '--output-mode', 'tags-split'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);

    expect(existsSync(join(workDir, 'client.http.ts'))).toBe(true);
    expect(existsSync(join(workDir, 'client.schemas.ts'))).toBe(true);
    expect(existsSync(join(workDir, 'Products/client.ts'))).toBe(true);
    expect(existsSync(join(workDir, 'Orders/client.ts'))).toBe(true);

    expect(readFileSync(join(workDir, 'Products/client.ts'), 'utf-8')).toContain(
      'from "../client.http.js"'
    );
    expect(readFileSync(entry, 'utf-8')).toContain("export * from './Products/client.js';");
  }, 90_000);

  test('the whole generated tree type-checks under strict mode with no unused imports', () => {
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
        ...collectTsFiles(workDir),
      ],
      { encoding: 'utf-8', cwd: workDir }
    );
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});
