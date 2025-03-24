import { isBrowser } from '../env.js';

describe('env', () => {
  it('should return non browser env', () => {
    expect(isBrowser()).toBe(false);
  });
});
