import { rmSync } from 'node:fs';

import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from '../shared/large-descriptions/large-descriptions.js';
import { expectJavacPasses } from './javac.js';

/** Java bar: the generated `Client.java` compiles with every lint on. */
async function expectJavaBar(description: string): Promise<void> {
  const dir = await generateWith(['java'], description);
  try {
    expectJavacPasses(dir, ['Client.java']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('rebilly description', () => {
  it('java compiles cleanly', () => expectJavaBar(rebillyDescription), LARGE_DESCRIPTION_TIMEOUT);
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, LARGE_DESCRIPTION_TIMEOUT);

  it('java compiles cleanly', () => expectJavaBar(github), LARGE_DESCRIPTION_TIMEOUT);
});
