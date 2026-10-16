import { spawnSync } from 'node:child_process';

import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from './large-descriptions.js';

/** Python bar: `import client` executes every dataclass declaration, which catches duplicate fields and bad defaults. */
function pythonBar(description: string): void {
  const dir = generateWith(['python'], description);
  const result = spawnSync('python3', ['-c', 'import client'], { cwd: dir, encoding: 'utf-8' });
  expect(result.status, result.stderr).toBe(0);
}

describe('rebilly description', () => {
  it('python imports cleanly', () => pythonBar(rebillyDescription), LARGE_DESCRIPTION_TIMEOUT);
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, LARGE_DESCRIPTION_TIMEOUT);

  it('python imports cleanly', () => pythonBar(github), LARGE_DESCRIPTION_TIMEOUT);
});
