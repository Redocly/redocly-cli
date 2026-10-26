import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from '../shared/large-descriptions/large-descriptions.js';

/** Python bar: `import client` executes every dataclass declaration, which catches duplicate fields and bad defaults. */
async function expectPythonBar(description: string): Promise<void> {
  const dir = await generateWith(['python'], description);
  try {
    const result = spawnSync('python3', ['-c', 'import client'], { cwd: dir, encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('rebilly description', () => {
  it(
    'python imports cleanly',
    () => expectPythonBar(rebillyDescription),
    LARGE_DESCRIPTION_TIMEOUT
  );
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, LARGE_DESCRIPTION_TIMEOUT);

  it('python imports cleanly', () => expectPythonBar(github), LARGE_DESCRIPTION_TIMEOUT);
});
