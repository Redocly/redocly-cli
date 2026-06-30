// Regression: an operation whose `<Op>Result` alias name collides with an existing schema
// name (operation `search` → the `SearchResult` schema it returns) must NOT emit the
// self-referential `export type SearchResult = SearchResult;`. That alias is circular and, in
// multi-file output, conflicts with the imported schema (TS2440) and duplicates the barrel
// re-export (TS2308). `base.yaml` carries this shape (`operationId: search` → `$ref SearchResult`,
// plus a `SearchResult` component). We generate the service-class/tags layout and strict-`tsc` it.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
const fixture = join(__dirname, 'fixtures', 'base.yaml');

/** Recursively collect every generated `.ts` file under `dir`. */
function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('generate-client operation/schema name collision', () => {
  it('does not emit a self-referential *Result alias; strict tsc passes over the tree', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-collision-'));
    const entry = join(dir, 'client.ts');
    const res = spawnSync(
      'node',
      [
        cli,
        'generate-client',
        fixture,
        '--output',
        entry,
        '--facade',
        'service-class',
        '--output-mode',
        'tags',
        '--args-style',
        'grouped',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);

    const files = collectTsFiles(dir);
    const allSource = files.map((f) => readFileSync(f, 'utf-8'));
    // No file may contain the circular self-alias (self-referential variant).
    for (let i = 0; i < files.length; i++) {
      expect(allSource[i], `self-referential alias in ${files[i]}`).not.toMatch(
        /export type (\w+) = \1;/
      );
    }
    // Non-self-referential variant: `GetStatusResult` exists as a schema, so the op's
    // `<Op>Result` alias must be suppressed — exactly one declaration across the tree.
    const declarations = allSource.join('\n').match(/export type GetStatusResult\b/g) ?? [];
    expect(declarations).toHaveLength(1);

    // Strict tsc over the whole tree (bundler resolution handles the `.js` ESM imports).
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
        ...files,
      ],
      { encoding: 'utf-8', cwd: dir }
    );
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
