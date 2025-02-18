import { isBrowser } from '../env';

describe('env', () => {
  it('should return non browser env', () => {
    expect(isBrowser()).toBe(false);
  });
});
