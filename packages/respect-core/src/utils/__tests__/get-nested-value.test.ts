import { getNestedValue } from '../get-nested-value.js';

describe('getNestedValue', () => {
  it('should return the value of a nested property', () => {
    const obj = {
      a: {
        b: {
          c: 1,
        },
      },
    };
    expect(getNestedValue(obj, ['a', 'b', 'c'])).toBe(1);
  });

  it('should return undefined if a nested property does not exist', () => {
    const obj = {
      a: {
        b: {
          c: 1,
        },
      },
    };
    expect(getNestedValue(obj, ['a', 'b', 'd'])).toBeUndefined();
  });

  it('should return the object itself if the path is empty', () => {
    const obj = {
      a: {
        b: {
          c: 1,
        },
      },
    };
    expect(getNestedValue(obj, [])).toBe(obj);
  });

  it('should handle null and undefined values', () => {
    const obj = {
      a: {
        b: null,
        c: undefined,
      },
    };
    expect(getNestedValue(obj, ['a', 'b'])).toBeNull();
    expect(getNestedValue(obj, ['a', 'c'])).toBeUndefined();
  });
});
