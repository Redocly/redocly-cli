import { getDiffFailure } from '../fail-on.js';

const summary = { major: 2, minor: 1, patch: 3 };

describe('getDiffFailure', () => {
  it.each([
    ['major', '❌ Diff failed with 2 major changes.'],
    ['minor', '❌ Diff failed with 2 major and 1 minor changes.'],
    ['patch', '❌ Diff failed with 2 major and 1 minor and 3 patch changes.'],
    ['none', undefined],
  ] as const)('with --fail-on=%s reports %s', (failOn, expected) => {
    expect(getDiffFailure(summary, failOn)).toBe(expected);
  });

  it('passes when nothing reaches the threshold', () => {
    expect(getDiffFailure({ major: 0, minor: 0, patch: 3 }, 'minor')).toBeUndefined();
  });

  it('uses the singular for one change', () => {
    expect(getDiffFailure({ major: 1, minor: 0, patch: 0 }, 'major')).toBe(
      '❌ Diff failed with 1 major change.'
    );
  });
});
