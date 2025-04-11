/**
 * @vitest-environment jsdom
 */

import { isBrowser } from '../env.js';

describe('isBrowser', () => {
  it('should be browser', () => {
    expect(isBrowser).toBe(true);
  });
});
