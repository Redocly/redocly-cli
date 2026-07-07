import { worstOf, compatRank, breaking, warning } from '../types.js';

describe('diff types helpers', () => {
  it('ranks compat levels', () => {
    expect(compatRank('breaking')).toBeGreaterThan(compatRank('warning'));
    expect(compatRank('warning')).toBeGreaterThan(compatRank('non-breaking'));
  });

  it('picks the worst compat', () => {
    expect(worstOf('non-breaking', 'breaking')).toBe('breaking');
    expect(worstOf('warning', 'non-breaking')).toBe('warning');
    expect(worstOf('warning', 'warning')).toBe('warning');
  });

  it('builds verdicts', () => {
    expect(breaking('boom')).toEqual({ compat: 'breaking', message: 'boom' });
    expect(warning('hmm')).toEqual({ compat: 'warning', message: 'hmm' });
  });
});
