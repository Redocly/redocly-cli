import { isScalarArray } from '../is-scalar.js';

describe('isScalarArray', () => {
  it.each([
    [[], true],
    [['coffee', 1, true, null], true],
    [[{ name: 'coffee' }], false],
    ['coffee', false],
  ])('tells whether %j is an array of scalars', (value, isArrayOfScalars) => {
    expect(isScalarArray(value)).toBe(isArrayOfScalars);
  });
});
