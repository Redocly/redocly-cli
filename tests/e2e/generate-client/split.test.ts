/**
 * E2E for `--output-mode split`: the generated multi-file set must compile under
 * strict `tsc` with `--noUnusedLocals`, which proves both that cross-file imports
 * resolve and that each file imports exactly what it uses (no over-importing).
 *
 * Uses cafe.yaml because it exercises the full http module (bearer + apiKey auth,
 * header params) and the schemas module (named types + discriminated-union guards).
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

describe('generate-client end-to-end (--output-mode split)', () => {
  let workDir = '';
  let entry = '';
  let httpFile = '';
  let schemasFile = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'split-client-'));
    entry = join(workDir, 'client.ts');
    httpFile = join(workDir, 'client.http.ts');
    schemasFile = join(workDir, 'client.schemas.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  test('writes three sibling files derived from --output', () => {
    const result = spawnSync(
      'node',
      [cliEntry, 'generate-client', fixture, '--output', entry, '--output-mode', 'split'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);
    expect(existsSync(entry)).toBe(true);
    expect(existsSync(httpFile)).toBe(true);
    expect(existsSync(schemasFile)).toBe(true);

    const entrySrc = readFileSync(entry, 'utf-8');
    // The entry imports helpers/types and re-exports the public surface.
    expect(entrySrc).toContain('from "./client.http.js"');
    expect(entrySrc).toContain('import type {');
    expect(entrySrc).toContain("export * from './client.schemas.js';");

    // The http module holds the runtime + auth; schemas holds the model types.
    const httpSrc = readFileSync(httpFile, 'utf-8');
    expect(httpSrc).toContain('export async function __request<T>(');
    expect(httpSrc).toContain('export function setBearer(');
    expect(readFileSync(schemasFile, 'utf-8')).toContain('export type ');
  }, 90_000);

  test('the multi-file set type-checks under strict mode with no unused imports', () => {
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
        httpFile,
        schemasFile,
      ],
      { encoding: 'utf-8', cwd: workDir }
    );
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});
