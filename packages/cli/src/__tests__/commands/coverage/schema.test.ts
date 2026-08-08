import {
  declared,
  matches,
  resolve,
  type Schema,
} from '../../../commands/coverage/engine/schema.js';

const SPEC: Schema = {
  components: {
    schemas: {
      Named: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } },
      Merged: {
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'string' } } },
        ],
      },
      Either: {
        oneOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'string' } } },
        ],
      },
      Composed: {
        allOf: [
          { $ref: '#/components/schemas/Named' },
          { type: 'object', properties: { extra: { type: 'string' } } },
        ],
      },
    },
  },
};

describe('resolve', () => {
  it('returns the schema untouched when there is no $ref', () => {
    const schema = { type: 'string' };

    expect(resolve({}, schema)).toEqual({ schema });
  });

  it('follows a local $ref and reports the target name', () => {
    expect(resolve(SPEC, { $ref: '#/components/schemas/Named' }).name).toBe('Named');
  });

  it('yields no schema for a $ref that points nowhere', () => {
    expect(resolve(SPEC, { $ref: '#/components/schemas/Absent' }).schema).toBeUndefined();
  });

  it('follows a chain of aliases to the schema that actually declares something', () => {
    const spec: Schema = {
      components: {
        schemas: {
          Alias: { $ref: '#/components/schemas/Real' },
          Real: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    };

    expect(resolve(spec, { $ref: '#/components/schemas/Alias' })).toEqual({
      schema: spec.components.schemas.Real,
      name: 'Real',
    });
  });

  it('decodes the ~1 and ~0 escapes in a pointer segment', () => {
    const spec: Schema = { paths: { '/a~b': { get: { type: 'string' } } } };

    expect(resolve(spec, { $ref: '#/paths/~1a~0b/get' }).schema).toEqual({ type: 'string' });
  });
});

describe('declared', () => {
  it('merges properties across allOf branches', () => {
    const names = declared(SPEC, SPEC.components.schemas.Merged).map(([name]) => name);

    expect(names.sort()).toEqual(['a', 'b']);
  });

  it('keeps oneOf branches apart rather than merging them, since they are alternatives', () => {
    const names = declared(SPEC, SPEC.components.schemas.Either).map(([name]) => name);

    expect(names.sort()).toEqual(['oneOf[0].a', 'oneOf[1].b']);
  });

  it('names a property once when two allOf branches both declare it', () => {
    const overlapping: Schema = {
      allOf: [
        { type: 'object', properties: { a: { type: 'string' } } },
        { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } } },
      ],
    };

    expect(declared(SPEC, overlapping).map(([name]) => name).sort()).toEqual(['a', 'b']);
  });

  it('reaches a property nested in an inline object, as the walk records it', () => {
    const nested: Schema = {
      type: 'object',
      properties: {
        address: { type: 'object', properties: { city: { type: 'string' } } },
      },
    };

    expect(declared(SPEC, nested).map(([name]) => name).sort()).toEqual(['address', 'address.city']);
  });

  it('stops at a $ref inside allOf, which the target reports under its own name', () => {
    const names = declared(SPEC, SPEC.components.schemas.Composed).map(([name]) => name);

    expect(names).toEqual(['extra']);
  });
});


describe('matches', () => {
  const ref = { $ref: '#/components/schemas/Named' };

  it('accepts a value carrying the required properties', () => {
    expect(matches(SPEC, ref, { id: 'x' })).toBe(true);
  });

  it('rejects an object missing a required property', () => {
    expect(matches(SPEC, ref, { other: 'x' })).toBe(false);
  });

  it('rejects an array where an object is expected', () => {
    expect(matches(SPEC, ref, [])).toBe(false);
  });

  it('rejects null where an object is expected', () => {
    expect(matches(SPEC, ref, null)).toBe(false);
  });

  it('separates integer from fractional numbers', () => {
    expect(matches(SPEC, { type: 'integer' }, 1)).toBe(true);
    expect(matches(SPEC, { type: 'integer' }, 1.5)).toBe(false);
    expect(matches(SPEC, { type: 'number' }, 1.5)).toBe(true);
  });

  it('distinguishes null from a string', () => {
    expect(matches(SPEC, { type: 'null' }, null)).toBe(true);
    expect(matches(SPEC, { type: 'string' }, null)).toBe(false);
  });

  it('honours enum membership', () => {
    expect(matches(SPEC, { enum: ['a', 'b'] }, 'a')).toBe(true);
    expect(matches(SPEC, { enum: ['a', 'b'] }, 'c')).toBe(false);
  });

  it('honours an OpenAPI 3.1 type array', () => {
    const nullableString = { type: ['string', 'null'] };

    expect(matches(SPEC, nullableString, 'x')).toBe(true);
    expect(matches(SPEC, nullableString, null)).toBe(true);
    expect(matches(SPEC, nullableString, 42)).toBe(false);
  });

  it('still holds a nullable enum to the values it lists', () => {
    // `nullable` relaxes the type, but the enum keeps listing what is allowed,
    // so a description that means to permit null has to say so. `drift` reads
    // it the same way, and the two have to agree on what a value satisfies.
    const nullable = { type: 'string', enum: ['a', 'b'], nullable: true };

    expect(matches(SPEC, nullable, null)).toBe(false);
    expect(matches(SPEC, nullable, 'a')).toBe(true);
    expect(matches(SPEC, { ...nullable, enum: ['a', 'b', null] }, null)).toBe(true);
  });

  it('applies an enum reached through allOf', () => {
    const wrapped = {
      allOf: [{ type: 'string' }, { enum: ['live', 'draft'] }],
    };

    expect(matches(SPEC, wrapped, 'live')).toBe(true);
    expect(matches(SPEC, wrapped, 'other')).toBe(false);
  });

  it('applies a const reached through allOf', () => {
    const wrapped = { allOf: [{ type: 'string' }, { const: 'only' }] };

    expect(matches(SPEC, wrapped, 'only')).toBe(true);
    expect(matches(SPEC, wrapped, 'other')).toBe(false);
  });

  it('honours an OpenAPI 3.1 const', () => {
    expect(matches(SPEC, { const: 'a' }, 'a')).toBe(true);
    expect(matches(SPEC, { const: 'a' }, 'b')).toBe(false);
    expect(matches(SPEC, { const: 0 }, 0)).toBe(true);
  });

  it('accepts a non-object value when the type array also allows one', () => {
    const either = { type: ['object', 'string'] };

    expect(matches(SPEC, either, 'x')).toBe(true);
    expect(matches(SPEC, either, {})).toBe(true);
    expect(matches(SPEC, either, 42)).toBe(false);
  });

  it('accepts null for an OpenAPI 3.0 nullable branch', () => {
    expect(matches(SPEC, { type: 'string', nullable: true }, null)).toBe(true);
    expect(matches(SPEC, { type: 'string' }, null)).toBe(false);
  });

  it('requires a value to satisfy one alternative of a nested union', () => {
    const spec: Schema = {
      components: {
        schemas: {
          Inner: { oneOf: [{ type: 'string' }, { type: 'boolean' }] },
        },
      },
    };
    const inner = { $ref: '#/components/schemas/Inner' };

    expect(matches(spec, inner, 'text')).toBe(true);
    expect(matches(spec, inner, true)).toBe(true);
    expect(matches(spec, inner, 42)).toBe(false);
  });

  it('applies a union reached through allOf', () => {
    const wrapped = { allOf: [{ anyOf: [{ type: 'string' }, { type: 'boolean' }] }] };

    expect(matches(SPEC, wrapped, 'text')).toBe(true);
    expect(matches(SPEC, wrapped, 42)).toBe(false);
  });

  it('rejects a branch whose $ref points nowhere', () => {
    expect(matches(SPEC, { $ref: '#/components/schemas/Absent' }, {})).toBe(false);
  });

  it('rejects a value an allOf-composed branch cannot be', () => {
    const composed = { $ref: '#/components/schemas/Composed' };

    expect(matches(SPEC, composed, 'not-an-object')).toBe(false);
    expect(matches(SPEC, composed, { id: 'x' })).toBe(true);
  });

  it('applies a required property inherited through allOf', () => {
    expect(matches(SPEC, { $ref: '#/components/schemas/Composed' }, { extra: 'x' })).toBe(false);
  });
});
