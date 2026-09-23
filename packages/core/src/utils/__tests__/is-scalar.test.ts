import { isScalarArray } from '../is-scalar.js';

describe('isScalarArray', () => {
  it('does not treat an empty array as a scalar value', () => {
    // An empty array is walked as a node of its own, so counting it as a scalar too
    // would report the same change twice (`security: []` did).
    expect(isScalarArray([])).toBe(false);
    expect(isScalarArray(['a', 1, true])).toBe(true);
  });
});
