/**
 * Proves the generated client types `ctx.operation.{id,path,tags}` as literal unions: a valid
 * comparison compiles, a misspelled operationId/tag does NOT. The whole point of the feature is
 * compile-time typo-catching, so it gets a dedicated strict-`tsc` check.
 *
 * Mechanism: the wiring instantiates `createClient<Ops, OperationId, OperationPath, …>`, so a
 * `use()` callback's ctx is contextually narrowed. The exported `RequestContext` TYPE keeps its
 * string defaults (spec-independent middleware stays assignable — asserted below).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { generate, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');

function gen(dir: string): void {
  generate(fixture, join(dir, 'client.ts'));
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ES2022',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        noEmit: true,
        allowImportingTsExtensions: true,
        lib: ['ES2022', 'DOM'],
        skipLibCheck: true,
      },
      include: ['*.ts'],
    }),
    'utf-8'
  );
}
function typechecks(dir: string, consumer: string): boolean {
  writeFileSync(join(dir, 'consumer.ts'), consumer, 'utf-8');
  return (
    spawnSync(tscBin, ['-p', join(dir, 'tsconfig.json')], { cwd: dir, encoding: 'utf-8' })
      .status === 0
  );
}

describe('typed ctx.operation rejects typos at compile time', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'optypes-'));
    gen(dir);
  }, 60_000);
  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  test('a valid operationId/path comparison compiles; base-typed middleware stays accepted', () => {
    expect(
      typechecks(
        dir,
        outdent`
          import { use, type RequestContext } from './client.ts';
          use({ onRequest: (ctx) => { if (ctx.operation.id === 'listPets' || ctx.operation.path === '/pets') {} } });
          use({ onRequest: (ctx: RequestContext) => { ctx.headers['X-Op'] = ctx.operation.id; } });
        `
      )
    ).toBe(true);
  }, 60_000);

  test('a misspelled operationId fails to compile', () => {
    expect(
      typechecks(
        dir,
        outdent`
          import { use } from './client.ts';
          use({ onRequest: (ctx) => { if (ctx.operation.id === 'listPetss') {} } });
        `
      )
    ).toBe(false);
  }, 60_000);
});
