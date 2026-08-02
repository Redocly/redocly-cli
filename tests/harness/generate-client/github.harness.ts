// GitHub's REST description (~1000 operations, downloaded at a pinned SHA) — the
// scale case that shook out the strict-mode reserved-word and +1/-1 naming bugs.

import {
  fetchGithubDescription,
  goBar,
  hasGo,
  hasPython,
  pythonBar,
  typescriptBar,
} from './helpers.js';

let github: string;

beforeAll(async () => {
  github = await fetchGithubDescription();
});

describe('github REST description', () => {
  it('sdk (TypeScript) passes strict tsc', () => {
    typescriptBar(github);
  });

  it.skipIf(!hasPython)('python imports cleanly', () => {
    pythonBar(github);
  });

  it.skipIf(!hasGo)('go builds and vets cleanly', () => {
    goBar(github);
  });
});
