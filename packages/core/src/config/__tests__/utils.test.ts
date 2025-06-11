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
});
