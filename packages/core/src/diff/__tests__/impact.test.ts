import { defaultImpact, highestImpact, impactRank } from '../impact.js';

describe('impact', () => {
  it('should rank patch below minor below major', () => {
    expect(impactRank('patch')).toBeLessThan(impactRank('minor'));
    expect(impactRank('minor')).toBeLessThan(impactRank('major'));
  });

  it('should pick the highest impact, and none from no impacts', () => {
    expect(highestImpact(['patch', 'major', 'minor'])).toBe('major');
    expect(highestImpact([])).toBeUndefined();
  });

  it('should take an unjudged addition for a minor and anything else for a patch', () => {
    expect(defaultImpact('added')).toBe('minor');
    expect(defaultImpact('removed')).toBe('patch');
    expect(defaultImpact('modified')).toBe('patch');
  });
});
