import * as utils from '../utils.js';

describe('mergeExtends', () => {
  it('should work with empty extends', () => {
    expect(utils.mergeExtends([]).rules).toEqual({});
  });

  it('should work with configurable rules changing severity', () => {
    expect(
      utils.mergeExtends([
        {
          rules: { 'rule/abc': { severity: 'error', subject: 'Operation' } },
        },
        {
          rules: { 'rule/abc': 'warn' },
        },
      ]).rules
    ).toEqual({
      'rule/abc': { severity: 'warn', subject: 'Operation' },
    });
  });

  it('keeps a recheck block that is not an object under a later block', () => {
    const merged = utils.mergeExtends([{ recheck: 5 as never }, { recheck: { rules: {} } }]);
    expect(merged.recheck as unknown).toBe(5);
  });
});
