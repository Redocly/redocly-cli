# Testing

1. Write meaningful tests that exercise real behavior — not tests that exist only to raise coverage.
   One focused, clear test is enough.
   Do not write conditional tests: no `if`, `skipIf`, or `runIf` that decides whether a test or an assertion runs.
1. Test a behavior where a user sees it.
   Behavior a user can see through the CLI belongs to an e2e test: a fixture directory with a snapshot
   under `tests/e2e/`, or a `generate-client` bar that compiles and runs the generated output.
   A unit test belongs to a pure function. It may fake the network, the clock, and the file system,
   but not the modules of this repository: a fake that returns what the assertion checks proves nothing.
   When an e2e test and a unit test prove the same contract, keep the e2e test.
1. Every test calls `expect`: Vitest fails a test that makes no assertion (`expect.requireAssertions`).
   A type-only check is not a Vitest test. Put it in a `__typecheck__` folder as `<name>.typecheck.ts`;
   `npm run typecheck` checks it, and Vitest does not run it.
1. Prove a new test once: make the one-line change in the code that should break it, see the test fail,
   and undo the change. Name that change in the pull request description.
1. A unit test lives in a `__tests__` folder beside the file it tests, and mirrors its name:
   `src/commands/eject-generator.ts` is tested by `src/commands/__tests__/eject-generator.test.ts`.
   Do not rebuild the source tree inside a `__tests__` folder (`src/__tests__/commands/…`) — the
   older tests that do are historical, and a reviewer should not have to guess which layout a
   new test follows. One module gets one test file: split a long one by `describe`, not by adding
   a second file for the same source.
   A large rule can be the exception: the `struct` tests are split by node type in a `struct/` folder.
   A scenario test that covers several modules (for example `bundle-oas.test.ts`) has no single
   source to sit beside: put it in the `__tests__` folder of the closest common parent, and name it
   after the scenario.
1. Rule tests are unit tests by convention: parse a YAML document, run `lintDocument`, and assert
   with `toMatchInlineSnapshot` — a behavior test in itself (given this input, these problems).
   Generate new snapshots and update stale ones as part of the change.
   When the rule must report no problems, assert `toEqual([])` — a snapshot adds nothing there.
1. Base the API description in a new test on the Redocly Cafe API (`resources/cafe.yaml`, or the
   multi-file `resources/cafe-split/`) when you can.
   Copy only the part the test needs, and change it to show the case.
   Use a different description only when Cafe (even modified) cannot show the case.

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

1. Write inline YAML in a test as an `outdent` template literal, as the pattern above does.
   Do not push the YAML to column zero, and do not build it from a one-line string with `\n`.

1. Compile before testing.

   Unit tests import from `lib/` (compiled output), not `src/` — run `npm run compile` after every change.

1. All packages share one test setup.
   Do not work around the compile step, and do not give one package or one part of the code its
   own test setup: no module aliases in `vitest.config.ts`, no `paths` or other `tsconfig` changes,
   and no new Vitest suite made only for it.
   If a test sees stale code, compile — do not change the config.
   The one exception is the `client-generators` projects below.

1. Run the full suite (`npm test`) after the code change, and make sure all tests pass in CI.
1. Client generation has its own projects: `npm run client-generators` runs the `tests/e2e/generate-client` bars.
   Run it for any generation change.
   These bars compile real Python, Go, PHP, and TypeScript output, some of it from large real-world descriptions.
   They are the slowest tests in the repository, and they need toolchains that no other test needs.
   A separate CI job keeps that cost out of the shared e2e job.
   There is one project per toolchain: `client-generators` for the TypeScript bars, and `client-generators-go`,
   `-php`, and `-python` for the files named `<language>.test.ts` or `<topic>.<language>.test.ts`.
   A language project runs a setup that checks its toolchain and stops the run when the toolchain is missing.
   Apart from that check, the projects only select test files: they compile and resolve code the same way as every other suite.
1. Smoke tests (`tests/smoke`, run by the `smoke-*` workflows) cover only what can fail an entire release: a Node.js version, a platform, a package manager, or the production bundle.
   They are added by hand after such a failure and kept deliberately small.
   A case that a unit or e2e test can cover does not belong there.
1. Coverage thresholds (`vitest.config.ts`) are a guide, not a number to game.
   If a feature or fix is already covered by e2e tests, propose lowering the threshold rather than padding the suite with unit tests that only chase coverage.
