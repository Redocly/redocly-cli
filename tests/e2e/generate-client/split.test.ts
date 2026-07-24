/**
 * E2E for `--output-mode split`: the generated two-file set must compile under
 * strict `tsc` with `--noUnusedLocals`, which proves both that cross-file imports
 * resolve and that each file imports exactly what it uses (no over-importing).
 *
 * Uses cafe.yaml because it exercises the embedded runtime broadly (bearer + apiKey
 * auth, header params) and the schemas module (named types + discriminated-union guards).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');

describe('generate-client end-to-end (--output-mode split)', () => {
  let workDir = '';
  let entry = '';
  let schemasFile = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'split-client-'));
    entry = join(workDir, 'client.ts');
    schemasFile = join(workDir, 'client.schemas.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }
  });

  test('writes two sibling files derived from --output', () => {
    generate(fixture, entry, ['--output-mode', 'split']);
    expect(existsSync(entry)).toBe(true);
    expect(existsSync(schemasFile)).toBe(true);
    // Split is exactly two files: no `.http.ts` module anymore.
    expect(existsSync(join(workDir, 'client.http.ts'))).toBe(false);

    const entrySrc = readFileSync(entry, 'utf-8');
    // The entry embeds the runtime, holds the descriptor wiring, imports schema
    // types, and re-exports the schemas module as the public type surface.
    expect(entrySrc).toContain('// ─── Embedded runtime');
    expect(entrySrc).toContain("from './client.schemas.js'");
    expect(entrySrc).toContain("export * from './client.schemas.js';");
    expect(entrySrc).toContain('as const satisfies Record<string, OperationDescriptor>');
    expect(entrySrc).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS,'
    );
    expect(entrySrc).toContain('export const { configure, use } = client;');
    expect(entrySrc).toContain('export const setBearer = client.auth.bearer;');

    // Schemas holds the model types and the discriminated-union guards.
    const schemasSrc = readFileSync(schemasFile, 'utf-8');
    expect(schemasSrc).toContain('export type ');
    expect(schemasSrc).toContain('export function isBeverage(');
  }, 90_000);

  test('the two-file set type-checks under strict mode with no unused imports', () => {
    expect(existsSync(entry), 'generation test must run first').toBe(true);

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
        schemasFile,
      ],
      { encoding: 'utf-8', cwd: workDir }
    );
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);

  // `--import-ext ts` targets runtimes that resolve specifiers literally (no `.js` → `.ts`
  // remap) — Node's built-in type stripping. Locked by actually executing `node main.ts`.
  test('--import-ext ts produces a client Node runs natively', () => {
    const tsEntry = join(workDir, 'client-ts.ts');
    generate(fixture, tsEntry, ['--output-mode', 'split', '--import-ext', 'ts']);

    const entrySrc = readFileSync(tsEntry, 'utf-8');
    expect(entrySrc).toContain("export * from './client-ts.schemas.ts';");
    expect(entrySrc).not.toContain('.schemas.js');

    const mainFile = join(workDir, 'main.ts');
    writeFileSync(
      mainFile,
      "import { isBeverage } from './client-ts.ts';\n" +
        "console.log('isBeverage:', typeof isBeverage);\n"
    );
    const run = spawnSync('node', [mainFile], { encoding: 'utf-8', cwd: workDir });
    expect(run.status, `node errors:\n${run.stderr}`).toBe(0);
    expect(run.stdout).toContain('isBeverage: function');
  }, 90_000);
});
