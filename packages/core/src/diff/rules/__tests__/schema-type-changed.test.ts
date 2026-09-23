import { acceptedTypes, typesNotIn } from '../schema-type-changed.js';

const lost = (before: unknown, after: unknown) =>
  typesNotIn(acceptedTypes(before), acceptedTypes(after));

describe('schema-type-changed', () => {
  it('finds the types one side accepts and the other does not', () => {
    // integer → number accepts more and loses nothing.
    expect(lost('integer', 'number')).toEqual([]);
    expect(lost('number', 'integer')).toEqual(['number']);
    // string → number is incompatible both ways.
    expect(lost('string', 'number')).toEqual(['string']);
    expect(lost('number', 'string')).toEqual(['number']);
    // Adding a type loses nothing; dropping one loses it.
    expect(lost('string', ['string', 'number'])).toEqual([]);
    expect(lost(['string', 'number'], 'string')).toEqual(['number']);
  });

  it('reads 3.0 `nullable` as the 3.1 null type, so the two spellings match', () => {
    const from30 = acceptedTypes('string', true);
    const from31 = acceptedTypes(['string', 'null']);

    expect(from30).toEqual(['string', 'null']);
    expect(typesNotIn(from30, from31)).toEqual([]);
    expect(typesNotIn(from31, from30)).toEqual([]);
    // Dropping nullability loses the null type.
    expect(typesNotIn(from30, acceptedTypes('string'))).toEqual(['null']);
  });
});
