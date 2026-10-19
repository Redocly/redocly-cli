// Tests `errorMode: 'result'`: the result-shape client with typed errors.
//
// We assert on the generated source and strict-tsc the output (single-file and the
// split two-file set). Strict tsc over the discriminated `Result<TData, TError>` proves
// that the typed `error` flows through. The retry and abort paths are shared with the
// throw mode (the runtime's `send`), and the base tests cover them. The split case checks
// that the entry also bakes `errorMode: "result"` into the client config.

import { generateClient } from '@redocly/client-generator';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { strictTypecheck } from '../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client error mode', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('single-file result mode: typed error alias + Result terminal, strict tsc passes', async () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-errmode-single-'));
    const out = join(dir, 'client.ts');
    await generateClient({
      api: join(__dirname, '../fixtures', 'error-mode.yaml'),
      output: out,
      errorMode: 'result',
    });
    expect(existsSync(out)).toBe(true);

    const generated = readFileSync(out, 'utf-8');
    expect(generated).toContain('export const { getThing } = client;');
    expect(generated).toContain('result: Result<GetThingResult, GetThingError>;');
    expect(generated).toContain('export type GetThingError = ProblemDetails;');
    // The mode is baked into the client instance config (configure() cannot flip it).
    expect(generated).toContain('errorMode: "result"');

    strictTypecheck(dir, ['client.ts']);
  }, 60_000);

  it('split result mode: the entry bakes errorMode result, strict tsc passes over both files', async () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-errmode-split-'));
    // Split mode takes a `.ts` entry path; the schemas file is written beside it.
    const entry = join(dir, 'client.ts');
    await generateClient({
      api: join(__dirname, '../fixtures', 'error-mode.yaml'),
      output: entry,
      errorMode: 'result',
      outputMode: 'split',
    });

    expect(readdirSync(dir).sort()).toEqual(['client.schemas.ts', 'client.ts']);

    // The result shape is baked into the entry: typed Ops results and the instance config.
    const entrySource = readFileSync(entry, 'utf-8');
    expect(entrySource).toContain('errorMode: "result"');
    expect(entrySource).toContain('Result<');

    strictTypecheck(dir);
  }, 60_000);
});
