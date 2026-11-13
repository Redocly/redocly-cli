import * as utils from '../utils.js';

describe('mergeExtends', () => {
  it('should work with empty extends', () => {
    expect(utils.mergeExtends([]).rules).toEqual({});
  });

  it('should read the deprecated no-example-value-and-externalValue rule as spec-example-values', () => {
    const merged = utils.mergeExtends([
      { oas3_1Rules: { 'spec-example-values': 'error' } },
      { rules: { 'no-example-value-and-externalValue': 'off' } },
    ]);

    expect(merged.rules).toEqual({ 'spec-example-values': 'off' });
    expect(merged.oas3_1Rules).toEqual({ 'spec-example-values': 'off' });
  });

  it('should read the deprecated rule name in oas3_2Rules and prefer spec-example-values when both names are set', () => {
    const merged = utils.mergeExtends([
      {
        // The type of oas3_2Rules does not list the deprecated name, but a redocly.yaml can contain it.
        oas3_2Rules: { 'no-example-value-and-externalValue': 'warn' } as Record<string, 'warn'>,
        oas3_1Rules: {
          'spec-example-values': 'off',
          'no-example-value-and-externalValue': 'error',
        } as Record<string, 'off' | 'error'>,
      },
    ]);

    expect(merged.oas3_2Rules).toEqual({ 'spec-example-values': 'warn' });
    expect(merged.oas3_1Rules).toEqual({ 'spec-example-values': 'off' });
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
