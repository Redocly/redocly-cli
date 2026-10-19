/**
 * Tests `outputMode: 'split'`: the generated two-file set must compile under
 * strict `tsc` with `noUnusedLocals`, which proves both that cross-file imports
 * resolve and that each file imports exactly what it uses (no over-importing).
 *
 * Uses cafe.yaml because it exercises the embedded runtime broadly (bearer + apiKey
 * auth, header params) and the schemas module (named types + discriminated-union guards).
 */

import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, strictTypecheck } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/cafe.yaml');

describe("generate-client outputMode: 'split'", () => {
  let workDir = '';
  let entry = '';
  let schemasFile = '';

  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer'));
    entry = join(workDir, 'client.ts');
    schemasFile = join(workDir, 'client.schemas.ts');
    await generateClient({ api: fixture, output: entry, outputMode: 'split' });
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  test('writes two sibling files derived from output', () => {
    expect(existsSync(entry)).toBe(true);
    expect(existsSync(schemasFile)).toBe(true);
    // Split is exactly two files: there is no `.http.ts` module.
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

    // Schemas holds the model types and the discriminated-union guards.
    const schemasSrc = readFileSync(schemasFile, 'utf-8');
    expect(schemasSrc).toContain('export type ');
    expect(schemasSrc).toContain('export function isBeverage(');
  });

  test('the two-file set type-checks under strict mode with no unused imports', () => {
    strictTypecheck(workDir, ['client.ts', 'client.schemas.ts']);
  });

  // `importExt: 'ts'` targets runtimes that resolve specifiers literally (no `.js` → `.ts`
  // remap) — Node's built-in type stripping. Locked by actually executing `node main.ts`.
  test("importExt: 'ts' produces a client Node runs natively", async () => {
    const tsEntry = join(workDir, 'client-ts.ts');
    await generateClient({ api: fixture, output: tsEntry, outputMode: 'split', importExt: 'ts' });

    const entrySrc = readFileSync(tsEntry, 'utf-8');
    expect(entrySrc).toContain("export * from './client-ts.schemas.ts';");
    expect(entrySrc).not.toContain('.schemas.js');

    const mainFile = join(workDir, 'main.ts');
    const run = spawnSync('node', [mainFile], { encoding: 'utf-8', cwd: workDir });
    expect(run.status, `node errors:\n${run.stderr}`).toBe(0);
    expect(run.stdout).toContain('isBeverage: function');
  });
});
