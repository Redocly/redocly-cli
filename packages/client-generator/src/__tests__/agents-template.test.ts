import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AUTHORING_HELPER_NAMES } from '../authoring/index.js';

const template = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../eject-assets/AGENTS.md'),
  'utf-8'
);

describe('eject-assets/AGENTS.md (the authoring skill template)', () => {
  it('documents every neutral helper — the skill cannot drift from the exports', () => {
    for (const name of AUTHORING_HELPER_NAMES) {
      expect(template.includes('`' + name), name).toBe(true);
    }
  });

  it('carries the contract, the verify loop, and the feedback instruction', () => {
    for (const marker of [
      'GeneratedFile',
      'redocly generate-client',
      'never hand-edit',
      'sample(',
      'missing helper',
    ]) {
      expect(template.toLowerCase()).toContain(marker.toLowerCase());
    }
  });
});
