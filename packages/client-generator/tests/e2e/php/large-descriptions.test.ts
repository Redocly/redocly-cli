import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from '../shared/large-descriptions/large-descriptions.js';

/** PHP bar: the generated `<stem>.php` parses (`php -l`) and declares (`require`). */
async function phpBar(description: string): Promise<void> {
  const dir = await generateWith(['php'], description);
  try {
    const lint = spawnSync('php', ['-l', 'client.php'], { cwd: dir, encoding: 'utf-8' });
    expect(lint.status, `${lint.stdout}\n${lint.stderr}`).toBe(0);
    const declare = spawnSync('php', ['-r', "require 'client.php'; echo 'DECLARED';"], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(declare.status, `${declare.stdout}\n${declare.stderr}`).toBe(0);
    expect(declare.stdout).toContain('DECLARED');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('rebilly description', () => {
  it(
    'php parses and declares cleanly',
    () => phpBar(rebillyDescription),
    LARGE_DESCRIPTION_TIMEOUT
  );
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, LARGE_DESCRIPTION_TIMEOUT);

  it('php parses and declares cleanly', () => phpBar(github), LARGE_DESCRIPTION_TIMEOUT);
});
