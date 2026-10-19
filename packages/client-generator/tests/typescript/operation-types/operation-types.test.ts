/**
 * Proves the generated client types `ctx.operation.{id,path,tags}` as literal unions: a valid
 * comparison compiles, a misspelled operationId does NOT. The whole point of the feature is
 * compile-time typo-catching, so it gets a dedicated strict-`tsc` check.
 *
 * Mechanism: the wiring instantiates `createClient<Ops, OperationId, OperationPath, …>`, so a
 * `use()` callback's ctx is contextually narrowed. The exported `RequestContext` TYPE keeps its
 * string defaults (spec-independent middleware stays assignable — asserted below).
 */

import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, runTsc } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/base.yaml');

describe('typed ctx.operation rejects typos at compile time', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts') });
  }, 60_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('a valid operationId/path comparison compiles; base-typed middleware stays accepted', () => {
    expectTscPasses(['-p', join(dir, 'tsconfig.valid-comparison.json')], dir);
  }, 60_000);

  test('a misspelled operationId fails to compile', () => {
    const tsc = runTsc(['-p', join(dir, 'tsconfig.misspelled-id.json'), '--pretty', 'false'], dir);
    expect(tsc.stdout).toContain('misspelled-id.ts(5,9): error TS2367');
    expect(tsc.stdout).toContain(`'"listPetss"' have no overlap`);
  }, 60_000);
});
