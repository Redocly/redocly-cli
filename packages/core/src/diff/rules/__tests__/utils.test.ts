import { acceptsLess } from '../utils.js';

describe('acceptsLess', () => {
  it('tells a constraint that accepts less from one that accepts more', () => {
    // A bound that leaves less room accepts less.
    expect(acceptsLess('maxLength', 100, 10)).toBe(true);
    expect(acceptsLess('maxLength', 10, 100)).toBe(false);
    expect(acceptsLess('minimum', 0, 10)).toBe(true);
    expect(acceptsLess('minimum', 10, 0)).toBe(false);
    // Presence alone decides when one side has no constraint.
    expect(acceptsLess('maxLength', undefined, 10)).toBe(true);
    expect(acceptsLess('maxLength', 10, undefined)).toBe(false);
    // Equivalence of a pattern or format cannot be computed, so assume the worst.
    expect(acceptsLess('pattern', '^a', '^b')).toBe(true);
    expect(acceptsLess('format', undefined, 'uuid')).toBe(true);
    // Closing an open object accepts less; opening it accepts more.
    expect(acceptsLess('additionalProperties', true, false)).toBe(true);
    expect(acceptsLess('additionalProperties', false, true)).toBe(false);
  });
});
