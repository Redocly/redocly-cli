import { compatRank, breaking } from '../types.js';

describe('diff types helpers', () => {
  it('ranks compat levels', () => {
    expect(compatRank('breaking')).toBeGreaterThan(compatRank('non-breaking'));
  });

  it('builds breaking verdicts', () => {
    expect(breaking('boom')).toEqual({ compat: 'breaking', message: 'boom' });
  });
});
