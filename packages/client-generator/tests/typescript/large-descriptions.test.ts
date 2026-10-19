import { join } from 'node:path';

import { expectTscPasses, strictTypecheck } from '../helpers/helpers.js';
import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from '../shared/large-descriptions/large-descriptions.js';

/** TS bar: the generated client passes a strict `tsc --noEmit`. */
async function typescriptBar(description: string): Promise<void> {
  const dir = await generateWith(['typescript'], description);
  strictTypecheck(dir);
}

/**
 * CLI bar: the generated `<stem>.cli.ts` passes a strict, Node-typed `tsc --noEmit`.
 * Selecting `cli` also emits the zod module it validates with. `zod` and `@types/node`
 * resolve through the node_modules link that `generateWith` adds.
 */
async function cliBar(description: string): Promise<void> {
  const dir = await generateWith(['typescript', 'cli'], description);
  expectTscPasses(['-p', join(dir, 'tsconfig.cli.json')]);
}

describe('rebilly description', () => {
  it(
    'sdk (TypeScript) passes strict tsc',
    () => typescriptBar(rebillyDescription),
    LARGE_DESCRIPTION_TIMEOUT
  );
  it(
    'cli passes strict Node-typed tsc',
    () => cliBar(rebillyDescription),
    LARGE_DESCRIPTION_TIMEOUT
  );
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, LARGE_DESCRIPTION_TIMEOUT);

  it('sdk (TypeScript) passes strict tsc', () => typescriptBar(github), LARGE_DESCRIPTION_TIMEOUT);
  it('cli passes strict Node-typed tsc', () => cliBar(github), LARGE_DESCRIPTION_TIMEOUT);
});
