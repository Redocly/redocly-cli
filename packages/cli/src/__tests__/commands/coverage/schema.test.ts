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

  it('does not merge properties across oneOf branches, which are alternatives', () => {
    expect(declared(SPEC, SPEC.components.schemas.Either)).toEqual([]);
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
