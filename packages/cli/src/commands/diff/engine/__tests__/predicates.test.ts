import {
  isScalar,
  isScalarArray,
  scalarEquals,
  missingItems,
  addedItems,
  becameTrue,
  isTypeNarrowed,
  isTypeWidened,
} from '../predicates.js';

describe('diff predicates', () => {
  it('detects scalars and scalar arrays', () => {
    expect(isScalar('a')).toBe(true);
    expect(isScalar(1)).toBe(true);
    expect(isScalar(null)).toBe(true);
    expect(isScalar({})).toBe(false);
    expect(isScalarArray(['a', 1, true])).toBe(true);
    expect(isScalarArray([{ a: 1 }])).toBe(false);
    expect(isScalarArray('a')).toBe(false);
  });

  it('compares scalars and scalar arrays', () => {
    expect(scalarEquals('a', 'a')).toBe(true);
    expect(scalarEquals(['a', 'b'], ['a', 'b'])).toBe(true);
    expect(scalarEquals(['a', 'b'], ['b', 'a'])).toBe(false);
    expect(scalarEquals(undefined, undefined)).toBe(true);
    expect(scalarEquals(1, '1')).toBe(false);
  });

  it('computes missing and added items', () => {
    expect(missingItems(['a', 'b', 'c'], ['a', 'b'])).toEqual(['c']);
    expect(missingItems(['a'], ['a', 'b'])).toEqual([]);
    expect(missingItems(undefined, ['a'])).toEqual([]);
    expect(addedItems(['a'], ['a', 'b'])).toEqual(['b']);
    expect(addedItems(['a'], undefined)).toEqual([]);
  });

  it('detects becameTrue', () => {
    expect(becameTrue(undefined, true)).toBe(true);
    expect(becameTrue(false, true)).toBe(true);
    expect(becameTrue(true, true)).toBe(false);
    expect(becameTrue(true, false)).toBe(false);
  });

  it('classifies type narrowing and widening', () => {
    // integer → number widens the accepted set
    expect(isTypeNarrowed('integer', 'number')).toBe(false);
    expect(isTypeWidened('integer', 'number')).toBe(true);
    // number → integer narrows it
    expect(isTypeNarrowed('number', 'integer')).toBe(true);
    expect(isTypeWidened('number', 'integer')).toBe(false);
    // string → number is incompatible both ways
    expect(isTypeNarrowed('string', 'number')).toBe(true);
    expect(isTypeWidened('string', 'number')).toBe(true);
    // same type — neither
    expect(isTypeNarrowed('string', 'string')).toBe(false);
    expect(isTypeWidened('string', 'string')).toBe(false);
  });
});
