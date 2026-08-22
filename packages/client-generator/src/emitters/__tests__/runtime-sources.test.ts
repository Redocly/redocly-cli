import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RUNTIME_SOURCES } from '../runtime-sources.js';

const pkgSrc = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtimeDir = join(pkgSrc, 'generators', 'typescript', 'runtime');
const STALE =
  'emitters/runtime-sources.ts is stale — run `npm run prepare -w @redocly/client-generator`';

/** A source region between two anchors (end exclusive), for the spliced-contract checks. */
function between(source: string, from: string, to: string): string {
  const start = source.indexOf(from);
  const end = source.indexOf(to, start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end).trimEnd();
}

describe('runtime-sources', () => {
  it('the generated snapshot matches the runtime sources (every module except the barrel)', () => {
    // `types.ts` is spliced (see the splice test below) and `cli.ts` lives with the cli
    // generator; every other module is embedded byte-for-byte.
    const expected = Object.fromEntries(
      readdirSync(runtimeDir)
        .filter((name) => name.endsWith('.ts') && name !== 'index.ts' && name !== 'types.ts')
        .map((name) => [name, readFileSync(join(runtimeDir, name), 'utf-8')])
    );
    expected['cli.ts'] = readFileSync(
      join(pkgSrc, 'generators', 'cli', 'runtime', 'cli.ts'),
      'utf-8'
    );
    const { 'types.ts': _types, ...rest } = RUNTIME_SOURCES;
    expect({ ...rest }, STALE).toEqual(expected);
  });

  it('the embedded types.ts splices the package-level contract types back in', () => {
    const embedded: string = RUNTIME_SOURCES['types.ts'];
    // Self-contained: no import or re-export may survive into the embeddable source.
    expect(embedded).not.toContain("from '../../../runtime-contract.js'");
    expect(embedded).not.toContain("from '../../../pagination.js'");
    // The definitions arrive verbatim from their package-level owners.
    const pagination = readFileSync(join(pkgSrc, 'pagination.ts'), 'utf-8');
    expect(embedded, STALE).toContain(
      between(pagination, '/**\n * How to auto-iterate', '\n\n/** The pagination styles')
    );
    const contract = readFileSync(join(pkgSrc, 'runtime-contract.ts'), 'utf-8');
    expect(embedded, STALE).toContain(
      between(contract, '/** Backoff shape:', '\n\n/**\n * The spec-independent subset')
    );
    // And the module's own tail is still the source file's, byte-for-byte.
    const source = readFileSync(join(runtimeDir, 'types.ts'), 'utf-8');
    expect(embedded, STALE).toContain(
      between(source, '/** Client configuration:', '\n\n/** Response readers')
    );
  });
});
