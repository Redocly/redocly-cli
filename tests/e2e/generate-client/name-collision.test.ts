// Regression: an operation whose `<Op>Result` alias name collides with an existing schema
// name (operation `search` → the `SearchResult` schema it returns) must NOT emit the
// self-referential `export type SearchResult = SearchResult;`. That alias is circular and, in
// split output, conflicts with the schema imported from the schemas module (TS2440) and
// duplicates the `export *` re-export (TS2308). `base.yaml` carries this shape
// (`operationId: search` → `$ref SearchResult`, plus a `SearchResult` component). We generate
// the split two-file layout and strict-`tsc` it.

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectTsFiles, expectTscPasses, generate } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures', 'base.yaml');

describe('generate-client operation/schema name collision', () => {
  it('does not emit a self-referential *Result alias; strict tsc passes over the split set', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-collision-'));
    const entry = join(dir, 'client.ts');
    generate(fixture, entry, ['--output-mode', 'split']);

    const files = collectTsFiles(dir);
    const allSource = files.map((f) => readFileSync(f, 'utf-8'));
    // No file may contain the circular self-alias (self-referential variant).
    for (let i = 0; i < files.length; i++) {
      expect(allSource[i], `self-referential alias in ${files[i]}`).not.toMatch(
        /export type (\w+) = \1;/
      );
    }
    // Non-self-referential variant: `GetStatusResult` exists as a schema, so the op's
    // `<Op>Result` alias must be suppressed — exactly one declaration across the set.
    const declarations = allSource.join('\n').match(/export type GetStatusResult\b/g) ?? [];
    expect(declarations).toHaveLength(1);

    // Strict tsc over the whole set (bundler resolution handles the `.js` ESM imports).
    expectTscPasses(
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
        ...files,
      ],
      dir
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
