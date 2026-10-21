// Security regression: a hostile OpenAPI document must never inject executable code
// into the generated client. `ts.factory.createIdentifier` prints names verbatim and
// JSDoc text is emitted as comments, so operationIds / schema names / descriptions
// carrying `(){};`, `export`, or `*/` are the attack surface. The generator must
// sanitize names and escape comments such that the output is inert and strict-`tsc`
// clean — every payload trapped inside an identifier or a comment, never a statement.

import { generateClient } from '@redocly/client-generator';
import { logger } from '@redocly/openapi-core';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expectStrictTscPasses } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client identifier / comment injection', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('sanitizes hostile names and escapes comments; output is strict-tsc clean', async () => {
    dir = mkdtempSync(join(tmpdir(), 'injection-'));
    const entry = join(dir, 'client.ts');
    const warn = vi.spyOn(logger, 'warn');
    await generateClient({ api: join(__dirname, 'openapi.yaml'), output: entry });
    // The unsafe operationId is reported and rewritten, not silently accepted.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('is not a usable identifier'));

    const src = readFileSync(entry, 'utf-8');
    // No live comment-breakout: the payload's `*/` is neutralized to `*\/`.
    expect(src).not.toMatch(/\*\/\s*;globalThis/);
    // No payload survives as a top-level statement (only inside identifiers/comments).
    expect(src).not.toMatch(/^\s*globalThis\.PWNED/m);
    // The operation name became a single valid identifier (no parens, spaces, or
    // semicolons), and it is exported by destructuring the client under that same name.
    const bindings = src.match(/export const \{ ([^}]*) \} = client;\s*$/m);
    expect(bindings, 'no operation bindings found in the generated client').not.toBeNull();
    for (const name of bindings![1].split(', ')) {
      expect(name).toMatch(/^[A-Za-z_$][A-Za-z0-9_$]*$/);
    }

    // Strongest proof: the whole file type-checks. Injected statements would not.
    expectStrictTscPasses(dir);
  });
});
