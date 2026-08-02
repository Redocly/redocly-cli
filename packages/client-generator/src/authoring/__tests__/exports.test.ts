import * as root from '../../index.js';
import { AUTHORING_HELPER_NAMES } from '../index.js';

describe('authoring toolkit exports', () => {
  it('exports every helper from the package root (the TS-free entry)', () => {
    for (const name of AUTHORING_HELPER_NAMES) {
      expect((root as Record<string, unknown>)[name], name).toBeDefined();
    }
  });

  it('exports the same helpers from /generate for toolkit-entry consistency', async () => {
    const generate = await import('../../generate.js');
    for (const name of AUTHORING_HELPER_NAMES) {
      expect((generate as Record<string, unknown>)[name], name).toBeDefined();
    }
  });
});
