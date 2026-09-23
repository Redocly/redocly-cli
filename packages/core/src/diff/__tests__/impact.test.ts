import { highestImpact, impactRank } from '../impact.js';

describe('impact ladder', () => {
  it('orders patch below minor below major', () => {
    expect(impactRank('patch')).toBeLessThan(impactRank('minor'));
    expect(impactRank('minor')).toBeLessThan(impactRank('major'));
  });

  it('picks the highest impact and none from an empty list', () => {
    expect(highestImpact(['patch', 'major', 'minor'])).toBe('major');
    expect(highestImpact([])).toBeUndefined();
  });
});
