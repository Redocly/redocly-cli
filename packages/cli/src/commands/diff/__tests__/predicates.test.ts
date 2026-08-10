import {
  constraintDirection,
  effectiveTypes,
  isScalarArray,
  isTypeSetNarrowed,
  isTypeSetWidened,
} from '../engine/predicates.js';

describe('diff predicates', () => {
  it('does not treat an empty array as a scalar value', () => {
    // An empty array is walked as a node of its own, so counting it as a scalar too
    // would report the same change twice (`security: []` did).
    expect(isScalarArray([])).toBe(false);
    expect(isScalarArray(['a', 1, true])).toBe(true);
  });

  it('classifies type narrowing and widening over the whole accepted set', () => {
    const narrowed = (before: unknown, after: unknown) =>
      isTypeSetNarrowed(effectiveTypes(before), effectiveTypes(after));
    const widened = (before: unknown, after: unknown) =>
      isTypeSetWidened(effectiveTypes(before), effectiveTypes(after));

    // integer → number widens the accepted set
    expect(narrowed('integer', 'number')).toBe(false);
    expect(widened('integer', 'number')).toBe(true);
    // number → integer narrows it
    expect(narrowed('number', 'integer')).toBe(true);
    expect(widened('number', 'integer')).toBe(false);
    // string → number is incompatible both ways
    expect(narrowed('string', 'number')).toBe(true);
    expect(widened('string', 'number')).toBe(true);
    // same type — neither
    expect(narrowed('string', 'string')).toBe(false);
    expect(widened('string', 'string')).toBe(false);

    // Accepting one more type is a widening, not a narrowing.
    expect(narrowed('string', ['string', 'number'])).toBe(false);
    expect(widened('string', ['string', 'number'])).toBe(true);
    // ...and dropping one is the narrowing.
    expect(narrowed(['string', 'number'], 'string')).toBe(true);
    expect(widened(['string', 'number'], 'string')).toBe(false);
  });

  it('reads 3.0 `nullable` as the 3.1 null type, so the two spellings match', () => {
    const from30 = effectiveTypes('string', true);
    const from31 = effectiveTypes(['string', 'null']);

    expect([...from30].sort()).toEqual(['null', 'string']);
    expect(isTypeSetNarrowed(from30, from31)).toBe(false);
    expect(isTypeSetWidened(from30, from31)).toBe(false);

    // Dropping nullability still narrows.
    expect(isTypeSetNarrowed(from30, effectiveTypes('string'))).toBe(true);
  });

  it('tells a tightened constraint from a loosened one', () => {
    // A bound that leaves less room accepts less.
    expect(constraintDirection('maxLength', 100, 10)).toBe('tighter');
    expect(constraintDirection('maxLength', 10, 100)).toBe('looser');
    expect(constraintDirection('minimum', 0, 10)).toBe('tighter');
    expect(constraintDirection('minimum', 10, 0)).toBe('looser');
    // Presence alone decides when one side has no constraint.
    expect(constraintDirection('maxLength', undefined, 10)).toBe('tighter');
    expect(constraintDirection('maxLength', 10, undefined)).toBe('looser');
    // Equivalence of a pattern or format cannot be computed, so assume the worst.
    expect(constraintDirection('pattern', '^a', '^b')).toBe('tighter');
    expect(constraintDirection('format', undefined, 'uuid')).toBe('tighter');
    // Closing an open object accepts less; opening it accepts more.
    expect(constraintDirection('additionalProperties', true, false)).toBe('tighter');
    expect(constraintDirection('additionalProperties', false, true)).toBe('looser');
    expect(constraintDirection('maxLength', 10, 10)).toBe('same');
  });
});
