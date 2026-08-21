import { GENERATOR_VERSION, satisfiesGeneratorRange } from '../compatibility.js';

describe('satisfiesGeneratorRange', () => {
  it('reads caret ranges, which are the ones ejected generators carry', () => {
    expect(satisfiesGeneratorRange('1.4.2', '^1.2.0')).toBe(true);
    expect(satisfiesGeneratorRange('1.2.0', '^1.2.0')).toBe(true);
    expect(satisfiesGeneratorRange('1.1.9', '^1.2.0')).toBe(false);
    expect(satisfiesGeneratorRange('2.0.0', '^1.2.0')).toBe(false);
    // While the package is 0.x the minor is the breaking position, so a caret pins it.
    expect(satisfiesGeneratorRange('0.2.9', '^0.2.1')).toBe(true);
    expect(satisfiesGeneratorRange('0.3.0', '^0.2.1')).toBe(false);
  });

  it('reads tilde, >=, and exact ranges', () => {
    expect(satisfiesGeneratorRange('1.2.9', '~1.2.0')).toBe(true);
    expect(satisfiesGeneratorRange('1.3.0', '~1.2.0')).toBe(false);
    expect(satisfiesGeneratorRange('9.9.9', '>=1.2.0')).toBe(true);
    expect(satisfiesGeneratorRange('1.1.0', '>=1.2.0')).toBe(false);
    expect(satisfiesGeneratorRange('1.2.0', '1.2.0')).toBe(true);
    expect(satisfiesGeneratorRange('1.2.1', '1.2.0')).toBe(false);
  });

  it('compares numerically, not as strings, and ignores a prerelease suffix', () => {
    expect(satisfiesGeneratorRange('1.10.0', '^1.9.0')).toBe(true);
    expect(satisfiesGeneratorRange('2.0.0-snapshot.1', '^2.0.0')).toBe(true);
  });

  it('returns undefined for a range it does not read, so the caller can say so', () => {
    for (const range of ['1.x || 2', '>1.2.0 <2.0.0', 'latest', '', 'v1']) {
      expect(satisfiesGeneratorRange('1.2.0', range)).toBeUndefined();
    }
  });

  it('exposes the running toolkit version', () => {
    expect(GENERATOR_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });
});
