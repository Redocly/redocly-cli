/**
 * @jest-environment jsdom
 */

import { isBrowser } from '../utils';

describe('isBrowser', () => {
  it('should be browser', () => {
    expect(isBrowser()).toBe(true);
  });
});
