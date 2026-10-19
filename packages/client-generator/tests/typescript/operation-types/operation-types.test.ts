/**
 * Proves the generated client types `ctx.operation.{id,path,tags}` as literal unions: a valid
 * comparison compiles, a misspelled operationId/tag does NOT. The whole point of the feature is
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

import { copyConsumer, runTsc } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/base.yaml');

/** Type-check the generated client with one consumer, through `tsconfig.<consumer>.json`. */
function typechecks(dir: string, consumer: string): boolean {
  return runTsc(['-p', join(dir, `tsconfig.${consumer}.json`)], dir).status === 0;
}

describe('typed ctx.operation rejects typos at compile time', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts') });
  }, 60_000);
  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  test('a valid operationId/path comparison compiles; base-typed middleware stays accepted', () => {
    expect(typechecks(dir, 'valid-comparison')).toBe(true);
  }, 60_000);

  test('a misspelled operationId fails to compile', () => {
    expect(typechecks(dir, 'misspelled-id')).toBe(false);
  }, 60_000);
});
