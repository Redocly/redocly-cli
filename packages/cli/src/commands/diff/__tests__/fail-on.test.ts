import { getDiffFailure } from '../fail-on.js';

describe('getDiffFailure', () => {
  it('fails when breaking changes exist and fail-on is breaking', () => {
    expect(getDiffFailure({ breaking: 2, nonBreaking: 1 }, 'breaking')).toBe(
      '❌ Diff failed with 2 breaking changes.'
    );
    expect(getDiffFailure({ breaking: 1, nonBreaking: 0 }, 'breaking')).toBe(
      '❌ Diff failed with 1 breaking change.'
    );
  });

  it('passes when there are no breaking changes', () => {
    expect(getDiffFailure({ breaking: 0, nonBreaking: 5 }, 'breaking')).toBeUndefined();
  });

  it('never fails when fail-on is none', () => {
    expect(getDiffFailure({ breaking: 3, nonBreaking: 0 }, 'none')).toBeUndefined();
  });
});
