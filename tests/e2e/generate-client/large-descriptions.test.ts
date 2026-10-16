import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { expectStrictTscPasses, expectTscPasses, linkNodeModules, repoRoot } from './helpers.js';
import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from './large-descriptions.js';

/** TS bar: the generated client passes a strict `tsc --noEmit`. */
function expectTypescriptBar(description: string): void {
  const dir = generateWith(['typescript'], description);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  expectStrictTscPasses(dir);
}

/**
 * CLI bar: the generated `<stem>.cli.ts` passes a strict, Node-typed `tsc --noEmit`.
 * Selecting `cli` also emits the zod module it validates with, so the resolver needs a
 * path to `zod` — taken from the repo, like `@types/node` below.
 */
function expectCliBar(description: string): void {
  const dir = generateWith(['typescript', 'cli'], description);
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  // The temp dir sits outside the repo, so node resolution finds nothing: borrow the
  // repo's node_modules for `zod` (the CLI's validation) and `@types/node`.
  linkNodeModules(dir);
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'nodenext',
        moduleResolution: 'nodenext',
        target: 'es2022',
        lib: ['ES2022', 'DOM'],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['node'],
        typeRoots: [join(repoRoot, 'node_modules/@types')],
      },
      include: ['**/*.ts'],
    }),
    'utf-8'
  );
  expectTscPasses(['-p', dir]);
}

describe('rebilly description', () => {
  it(
    'sdk (TypeScript) passes strict tsc',
    () => expectTypescriptBar(rebillyDescription),
    LARGE_DESCRIPTION_TIMEOUT
  );
  it(
    'cli passes strict Node-typed tsc',
    () => expectCliBar(rebillyDescription),
    LARGE_DESCRIPTION_TIMEOUT
  );
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, LARGE_DESCRIPTION_TIMEOUT);

  it(
    'sdk (TypeScript) passes strict tsc',
    () => expectTypescriptBar(github),
    LARGE_DESCRIPTION_TIMEOUT
  );
  it('cli passes strict Node-typed tsc', () => expectCliBar(github), LARGE_DESCRIPTION_TIMEOUT);
});
