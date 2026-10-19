// Regression: an operation whose `<Op>Result` alias name collides with an existing schema
// name (operation `search` → the `SearchResult` schema it returns) must NOT emit the
// self-referential `export type SearchResult = SearchResult;`. That alias is circular and, in
// split output, conflicts with the schema imported from the schemas module (TS2440) and
// duplicates the `export *` re-export (TS2308). `base.yaml` carries this shape
// (`operationId: search` → `$ref SearchResult`, plus a `SearchResult` component). We generate
// the split two-file layout and strict-`tsc` it.

import { generateClient } from '@redocly/client-generator';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { strictTypecheck } from '../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures', 'base.yaml');

describe('generate-client operation/schema name collision', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not emit a self-referential *Result alias; strict tsc passes over the split set', async () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-collision-'));
    const entry = join(dir, 'client.ts');
    await generateClient({ api: fixture, output: entry, outputMode: 'split' });

    const sources: string[] = [];
    for (const fileName of readdirSync(dir)) {
      const source = readFileSync(join(dir, fileName), 'utf-8');
      // No file may contain the circular self-alias (self-referential variant).
      expect(source, `self-referential alias in ${fileName}`).not.toMatch(
        /export type (\w+) = \1;/
      );
      sources.push(source);
    }
    // Non-self-referential variant: `GetStatusResult` exists as a schema, so the op's
    // `<Op>Result` alias must be suppressed — exactly one declaration across the set.
    const declarations = sources.join('\n').match(/export type GetStatusResult\b/g) ?? [];
    expect(declarations).toHaveLength(1);

    strictTypecheck(dir);
  }, 60_000);
});
