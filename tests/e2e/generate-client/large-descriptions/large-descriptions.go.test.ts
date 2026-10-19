import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from './large-descriptions.js';

/** Go bar: `go build` + `go vet` (vet catches json tags on unexported fields). */
function goBar(description: string): void {
  const dir = generateWith(['go'], description);
  writeFileSync(join(dir, 'go.mod'), 'module largedesc.test\n\ngo 1.21\n', 'utf-8');
  const build = spawnSync('go', ['build', './...'], { cwd: dir, encoding: 'utf-8' });
  expect(build.status, build.stderr).toBe(0);
  const vet = spawnSync('go', ['vet', './...'], { cwd: dir, encoding: 'utf-8' });
  expect(vet.status, vet.stderr).toBe(0);
}

describe('rebilly description', () => {
  it('go builds and vets cleanly', () => goBar(rebillyDescription), LARGE_DESCRIPTION_TIMEOUT);
});

describe('github REST description', () => {
  let github: string;

  beforeAll(async () => {
    github = await fetchGithubDescription();
  }, LARGE_DESCRIPTION_TIMEOUT);

  it('go builds and vets cleanly', () => goBar(github), LARGE_DESCRIPTION_TIMEOUT);
});
