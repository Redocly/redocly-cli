# Testing

1. Write meaningful tests that exercise real behavior — not tests that exist only to raise coverage.
   One focused, clear test is enough.
1. A unit test lives in a `__tests__` folder beside the file it tests, and mirrors its name:
   `src/commands/eject-generator.ts` is tested by `src/commands/__tests__/eject-generator.test.ts`.
   Do not rebuild the source tree inside a `__tests__` folder (`src/__tests__/commands/…`) — the
   older tests that do are historical, and a reviewer should not have to guess which layout a
   new test follows. One module gets one test file: split a long one by `describe`, not by adding
   a second file for the same source.
1. Rule tests are unit tests by convention: parse a YAML document, run `lintDocument`, and assert
   with `toMatchInlineSnapshot` — a behavior test in itself (given this input, these problems).
   Generate new snapshots and update stale ones as part of the change.

   The pattern — parse, lint, assert on the whole output:

   ```ts
   import { outdent } from 'outdent';
   import { parseYamlToDocument, replaceSourceWithRef } from '../../../../__tests__/utils.js';
   import { createConfig } from '../../../config/index.js';
   import { lintDocument } from '../../../lint.js';
   import { BaseResolver } from '../../../resolve.js';

   describe('Oas3 no-my-rule', () => {
     it('should report a violation', async () => {
       const document = parseYamlToDocument(
         outdent`
           openapi: 3.0.0
           ...
         `,
         'foobar.yaml'
       );

       const results = await lintDocument({
         externalRefResolver: new BaseResolver(),
         document,
         config: await createConfig({ rules: { 'no-my-rule': 'error' } }),
       });

       expect(replaceSourceWithRef(results)).toMatchInlineSnapshot(`...`);
     });
   });
   ```

1. Compile before testing.

   Unit tests import from `lib/` (compiled output), not `src/` — run `npm run compile` after every change.

1. Run the full suite (`npm test`) when you touch core linting logic, and make sure all tests pass in CI.
1. Client generation has its own suite: `npm run client-generators` runs the client-generator unit tests plus the `tests/e2e/generate-client` bars (which compile real Python/Go/PHP/TypeScript output).
   Run it for any generation change; `npm run e2e` does not include those tests.
1. Coverage thresholds (`vitest.config.ts`) are a guide, not a number to game.
   If a feature or fix is already covered by e2e tests, propose lowering the threshold rather than padding the suite with unit tests that only chase coverage.
