import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { expectStrictTscPasses, expectTscPasses } from '../helpers/helpers.js';
import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from '../shared/large-descriptions/large-descriptions.js';

/** TS bar: the generated client passes a strict `tsc --noEmit`. */
async function expectTypescriptBar(description: string): Promise<void> {
  const dir = await generateWith(['typescript'], description);
  try {
    expectStrictTscPasses(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * CLI bar: the generated `<stem>.cli.ts` passes a strict, Node-typed `tsc --noEmit`.
 * Selecting `cli` also emits the zod module it validates with. `zod` and `@types/node`
 * resolve through the node_modules link that `generateWith` adds.
 */
async function expectCliBar(description: string): Promise<void> {
  const dir = await generateWith(['typescript', 'cli'], description);
  try {
    expectTscPasses(['-p', join(dir, 'tsconfig.cli.json')]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
