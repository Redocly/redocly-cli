import { slash } from '../utils';

describe('slash path', () => {
  it('can correctly slash path', () => {
    [
      ['foo\\bar', 'foo/bar'],
      ['foo/bar', 'foo/bar'],
      ['foo\\中文', 'foo/中文'],
      ['foo/中文', 'foo/中文'],
    ].forEach(([path, expectRes]) => {
      expect(slash(path)).toBe(expectRes);
    });
  });

  it('does not modify extended length paths', () => {
    const extended = '\\\\?\\some\\path';
    expect(slash(extended)).toBe(extended);
  });
});
