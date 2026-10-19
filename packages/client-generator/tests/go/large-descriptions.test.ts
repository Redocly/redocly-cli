import { spawnSync } from 'node:child_process';

import {
  fetchGithubDescription,
  generateWith,
  LARGE_DESCRIPTION_TIMEOUT,
  rebillyDescription,
} from '../shared/large-descriptions/large-descriptions.js';

/** Go bar: `go build` + `go vet` (vet catches json tags on unexported fields). */
async function goBar(description: string): Promise<void> {
  const dir = await generateWith(['go'], description);
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
