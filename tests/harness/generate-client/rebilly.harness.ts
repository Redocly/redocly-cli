// Rebilly (vendored, 638 operations, allOf-heavy) — the real-world description
// that shook out the allOf pagination fix and the Go `3ds` field-export bug.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { goBar, hasGo, hasPython, pythonBar, typescriptBar } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rebilly = join(__dirname, '../../smoke/rebilly/rebilly-description.yaml');

describe('rebilly description', () => {
  it('sdk (TypeScript) passes strict tsc', () => {
    typescriptBar(rebilly);
  });

  it.skipIf(!hasPython)('python imports cleanly', () => {
    pythonBar(rebilly);
  });

  it.skipIf(!hasGo)('go builds and vets cleanly', () => {
    goBar(rebilly);
  });
});
