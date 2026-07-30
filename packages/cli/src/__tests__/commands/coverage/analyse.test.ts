import { summarize } from '../../../commands/coverage/engine/analyse.js';
import type { Schema } from '../../../commands/coverage/engine/schema.js';
import { createCoverage, walkRoot } from '../../../commands/coverage/engine/walk.js';

const SPEC: Schema = {
  openapi: '3.0.3',
  components: {
    schemas: {
      Thing: {
        type: 'object',
        properties: {
          always: { type: 'string' },
          never: { type: 'string' },
          nested: { $ref: '#/components/schemas/Nested' },
          choice: { oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Nested' }] },
        },
      },
      Nested: {
        type: 'object',
        properties: { inner: { type: 'string' }, unreached: { type: 'string' } },
      },
    },
  },
};

const THING = { $ref: '#/components/schemas/Thing' };

function report(values: unknown[], schemaFilter?: string) {
  const coverage = createCoverage();
  for (const value of values) walkRoot(SPEC, coverage, THING, value);

  return summarize(SPEC, coverage, { total: values.length, withBody: values.length }, schemaFilter);
}

function schemaNamed(values: unknown[], name: string) {
  const found = report(values).schemas.find((schema) => schema.name === name);
  if (!found) throw new Error(`no report for ${name}`);

  return found;
}

describe('coverage', () => {
  it('credits a property the value carried', () => {
    expect(schemaNamed([{ always: 'x' }], 'Thing').unusedProperties).toEqual([
      'choice',
      'nested',
      'never',
    ]);
  });

  it('reports every property when nothing reached the schema', () => {
    expect(schemaNamed([], 'Thing').unusedProperties).toEqual([
      'always',
      'choice',
      'nested',
      'never',
    ]);
  });

  it('attributes properties reached through a $ref to the target schema', () => {
    expect(schemaNamed([{ nested: { inner: 'x' } }], 'Nested').unusedProperties).toEqual([
      'unreached',
    ]);
  });

  it('counts a property present but null as observed', () => {
    expect(schemaNamed([{ always: null }], 'Thing').unusedProperties).not.toContain('always');
  });

  it('reports the union branch a value never matched', () => {
    expect(schemaNamed([{ choice: 'text' }], 'Thing').unusedVariants).toEqual([
      { path: 'choice', keyword: 'oneOf', branches: [1] },
    ]);
  });

  it('reports the other branch when the value takes the object form', () => {
    expect(schemaNamed([{ choice: { inner: 'x' } }], 'Thing').unusedVariants).toEqual([
      { path: 'choice', keyword: 'oneOf', branches: [0] },
    ]);
  });

  it('reports no unused branch once both have been seen', () => {
    const values = [{ choice: 'text' }, { choice: { inner: 'x' } }];

    expect(schemaNamed(values, 'Thing').unusedVariants).toEqual([]);
  });

  it('descends only into the branch that matched', () => {
    expect(schemaNamed([{ choice: 'text' }], 'Nested').unusedProperties).toEqual([
      'inner',
      'unreached',
    ]);
  });

  it('lists a schema nothing reached', () => {
    expect(report([{ always: 'x' }]).unusedSchemas).toEqual(['Nested']);
  });

  it('omits a schema once a value reached it', () => {
    expect(report([{ nested: { inner: 'x' } }]).unusedSchemas).toEqual([]);
  });

  it('narrows to one schema when a filter is given', () => {
    expect(report([], 'Nested').schemas.map(({ name }) => name)).toEqual(['Nested']);
  });

  it('counts observed against declared properties across schemas', () => {
    const result = report([{ always: 'x', nested: { inner: 'y' } }]);

    expect(result.totalProperties).toBe(6);
    expect(result.seenProperties).toBe(3);
  });
});

describe('coverage of a schema that only holds a union', () => {
  const UNIONS: Schema = {
    components: {
      schemas: {
        Shape: {
          oneOf: [{ $ref: '#/components/schemas/Circle' }, { $ref: '#/components/schemas/Square' }],
        },
        Circle: { type: 'object', required: ['radius'], properties: { radius: { type: 'number' } } },
        Square: { type: 'object', required: ['side'], properties: { side: { type: 'number' } } },
        Holder: { type: 'object', properties: { shape: { $ref: '#/components/schemas/Shape' } } },
      },
    },
  };

  function circle() {
    const coverage = createCoverage();
    walkRoot(UNIONS, coverage, { $ref: '#/components/schemas/Holder' }, { shape: { radius: 1 } });

    return summarize(UNIONS, coverage, { total: 1, withBody: 1 });
  }

  it('does not call a union schema unreached when a value went through it', () => {
    expect(circle().unusedSchemas).toEqual(['Square']);
  });

  it('reports the branch that never matched', () => {
    expect(circle().schemas.find(({ name }) => name === 'Shape')?.unusedVariants).toEqual([
      { path: '', keyword: 'oneOf', branches: [1] },
    ]);
  });
});

describe('a union whose branches share a property', () => {
  const MEDIA: Schema = {
    components: {
      schemas: {
        Media: {
          oneOf: [{ $ref: '#/components/schemas/Photo' }, { $ref: '#/components/schemas/Video' }],
        },
        Photo: {
          type: 'object',
          properties: { kind: { type: 'string' }, width: { type: 'integer' } },
        },
        Video: {
          type: 'object',
          properties: { kind: { type: 'string' }, duration: { type: 'integer' } },
        },
      },
    },
  };

  function photo() {
    const coverage = createCoverage();
    walkRoot(MEDIA, coverage, { $ref: '#/components/schemas/Media' }, { kind: 'photo', width: 10 });

    return summarize(MEDIA, coverage, { total: 1, withBody: 1 });
  }

  it('credits only the branch the value actually fits', () => {
    expect(photo().schemas.find(({ name }) => name === 'Media')?.unusedVariants).toEqual([
      { path: '', keyword: 'oneOf', branches: [1] },
    ]);
  });

  it('does not mark the sibling branch as reached', () => {
    expect(photo().unusedSchemas).toEqual(['Video']);
  });
});

describe('a union with a discriminator', () => {
  const PETS: Schema = {
    components: {
      schemas: {
        Pet: {
          oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
          discriminator: { propertyName: 'petType' },
        },
        Cat: { type: 'object', properties: { petType: { type: 'string' } } },
        Dog: { type: 'object', properties: { petType: { type: 'string' } } },
      },
    },
  };

  it('picks the branch the discriminator names, not both', () => {
    const coverage = createCoverage();
    walkRoot(PETS, coverage, { $ref: '#/components/schemas/Pet' }, { petType: 'Cat' });

    expect(summarize(PETS, coverage, { total: 1, withBody: 1 }).unusedSchemas).toEqual(['Dog']);
  });

  it('accepts a mapping written as a bare component name', () => {
    const mapped: Schema = {
      components: {
        schemas: {
          Pet: {
            oneOf: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
            discriminator: { propertyName: 'petType', mapping: { kitten: 'Cat' } },
          },
          Cat: { type: 'object', properties: { petType: { type: 'string' } } },
          Dog: { type: 'object', properties: { petType: { type: 'string' } } },
        },
      },
    };

    const coverage = createCoverage();
    walkRoot(mapped, coverage, { $ref: '#/components/schemas/Pet' }, { petType: 'kitten' });

    expect(summarize(mapped, coverage, { total: 1, withBody: 1 }).unusedSchemas).toEqual(['Dog']);
  });
});

describe('component schemas with nothing inside them', () => {
  const LEAVES: Schema = {
    components: {
      schemas: {
        Status: { type: 'string', enum: ['live', 'draft'] },
        Count: { type: 'integer' },
        Tags: { type: 'array', items: { $ref: '#/components/schemas/Status' } },
        Thing: { type: 'object', properties: { id: { type: 'string' } } },
      },
    },
  };

  it('lists an unreached enum, primitive, or array of refs as nothing reached', () => {
    const coverage = createCoverage();
    walkRoot(LEAVES, coverage, { $ref: '#/components/schemas/Thing' }, { id: 'x' });

    expect(summarize(LEAVES, coverage, { total: 1, withBody: 1 }).unusedSchemas).toEqual([
      'Count',
      'Status',
      'Tags',
    ]);
  });

  it('does not clutter the schema list with them', () => {
    const coverage = createCoverage();
    walkRoot(LEAVES, coverage, { $ref: '#/components/schemas/Thing' }, { id: 'x' });

    expect(
      summarize(LEAVES, coverage, { total: 1, withBody: 1 }).schemas.map(({ name }) => name)
    ).toEqual(['Thing']);
  });
});

describe('a union of const literals', () => {
  const LITERALS: Schema = {
    components: {
      schemas: {
        Status: { oneOf: [{ const: 'active' }, { const: 'archived' }, { const: 'draft' }] },
        Holder: { type: 'object', properties: { status: { $ref: '#/components/schemas/Status' } } },
      },
    },
  };

  it('credits only the literal the value carried', () => {
    const coverage = createCoverage();
    walkRoot(LITERALS, coverage, { $ref: '#/components/schemas/Holder' }, { status: 'archived' });

    expect(
      summarize(LITERALS, coverage, { total: 1, withBody: 1 }).schemas.find(
        ({ name }) => name === 'Status'
      )?.unusedVariants
    ).toEqual([{ path: '', keyword: 'oneOf', branches: [0, 2] }]);
  });
});

describe('a union of same-typed branches split by format', () => {
  const FORMATS: Schema = {
    components: {
      schemas: {
        Id: {
          oneOf: [
            { type: 'string', format: 'uuid' },
            { type: 'string', format: 'date' },
          ],
        },
        Holder: { type: 'object', properties: { id: { $ref: '#/components/schemas/Id' } } },
      },
    },
  };

  it('credits the branch whose format the value satisfies', () => {
    const coverage = createCoverage();
    walkRoot(
      FORMATS,
      coverage,
      { $ref: '#/components/schemas/Holder' },
      { id: '6fa459ea-ee8a-3ca4-894e-db77e160355e' }
    );

    expect(
      summarize(FORMATS, coverage, { total: 1, withBody: 1 }).schemas.find(
        ({ name }) => name === 'Id'
      )?.unusedVariants
    ).toEqual([{ path: '', keyword: 'oneOf', branches: [1] }]);
  });
});

describe('a union branch split by a format inside allOf', () => {
  const WRAPPED: Schema = {
    components: {
      schemas: {
        Id: {
          oneOf: [
            { allOf: [{ type: 'string' }, { format: 'uuid' }] },
            { allOf: [{ type: 'string' }, { format: 'date' }] },
          ],
        },
        Holder: { type: 'object', properties: { id: { $ref: '#/components/schemas/Id' } } },
      },
    },
  };

  it('ranks by the format the allOf declares', () => {
    const coverage = createCoverage();
    walkRoot(
      WRAPPED,
      coverage,
      { $ref: '#/components/schemas/Holder' },
      { id: '6fa459ea-ee8a-3ca4-894e-db77e160355e' }
    );

    expect(
      summarize(WRAPPED, coverage, { total: 1, withBody: 1 }).schemas.find(
        ({ name }) => name === 'Id'
      )?.unusedVariants
    ).toEqual([{ path: '', keyword: 'oneOf', branches: [1] }]);
  });
});

describe('unions nested inside sibling branches', () => {
  const WRAPPER: Schema = {
    components: {
      schemas: {
        Wrapper: {
          oneOf: [
            {
              type: 'object',
              required: ['a'],
              properties: { x: { oneOf: [{ type: 'string' }, { type: 'integer' }] } },
            },
            {
              type: 'object',
              required: ['b'],
              properties: {
                x: { oneOf: [{ type: 'boolean' }, { type: 'null' }, { type: 'array' }] },
              },
            },
          ],
        },
      },
    },
  };

  it('keeps each branch its own union site', () => {
    const coverage = createCoverage();
    walkRoot(WRAPPER, coverage, { $ref: '#/components/schemas/Wrapper' }, { a: 1, x: 'text' });

    expect(
      summarize(WRAPPER, coverage, { total: 1, withBody: 1 }).schemas.find(
        ({ name }) => name === 'Wrapper'
      )?.unusedVariants
    ).toEqual([
      { path: '', keyword: 'oneOf', branches: [1] },
      { path: 'oneOf[0].x', keyword: 'oneOf', branches: [1] },
      { path: 'oneOf[1].x', keyword: 'oneOf', branches: [0, 1, 2] },
    ]);
  });
});

describe('additionalProperties', () => {
  const MAP: Schema = {
    components: {
      schemas: {
        Bag: {
          type: 'object',
          properties: { name: { type: 'string' } },
          additionalProperties: { $ref: '#/components/schemas/Extra' },
        },
        Extra: { type: 'object', properties: { note: { type: 'string' } } },
      },
    },
  };

  it('does not walk a declared property against the additionalProperties schema', () => {
    const coverage = createCoverage();
    walkRoot(MAP, coverage, { $ref: '#/components/schemas/Bag' }, { name: 'x' });

    expect(summarize(MAP, coverage, { total: 1, withBody: 1 }).unusedSchemas).toEqual(['Extra']);
  });

  it('does not walk a property inherited through allOf against it either', () => {
    const inheritedMap: Schema = {
      components: {
        schemas: {
          Base: { type: 'object', properties: { name: { type: 'string' } } },
          Bag: {
            allOf: [{ $ref: '#/components/schemas/Base' }],
            additionalProperties: { $ref: '#/components/schemas/Extra' },
          },
          Extra: { type: 'object', properties: { note: { type: 'string' } } },
        },
      },
    };

    const coverage = createCoverage();
    walkRoot(inheritedMap, coverage, { $ref: '#/components/schemas/Bag' }, { name: 'x' });

    expect(summarize(inheritedMap, coverage, { total: 1, withBody: 1 }).unusedSchemas).toEqual([
      'Extra',
    ]);
  });
});

describe('an inline additionalProperties schema', () => {
  const COLLIDING: Schema = {
    components: {
      schemas: {
        Bag: {
          type: 'object',
          properties: { name: { type: 'string' } },
          additionalProperties: {
            type: 'object',
            properties: { name: { type: 'string' } },
          },
        },
      },
    },
  };

  it('does not credit a parent property the payload never carried', () => {
    const coverage = createCoverage();
    walkRoot(COLLIDING, coverage, { $ref: '#/components/schemas/Bag' }, { extra: { name: 'y' } });

    expect(
      summarize(COLLIDING, coverage, { total: 1, withBody: 1 }).schemas.find(
        ({ name }) => name === 'Bag'
      )
    ).toMatchObject({ seen: 0, unusedProperties: ['name'] });
  });
});

describe('a nested inline object', () => {
  const NESTED: Schema = {
    components: {
      schemas: {
        Person: {
          type: 'object',
          properties: {
            address: {
              type: 'object',
              properties: { city: { type: 'string' }, postcode: { type: 'string' } },
            },
          },
        },
      },
    },
  };

  it('reports the nested field the traffic never carried', () => {
    const coverage = createCoverage();
    walkRoot(NESTED, coverage, { $ref: '#/components/schemas/Person' }, { address: { city: 'x' } });

    expect(
      summarize(NESTED, coverage, { total: 1, withBody: 1 }).schemas.find(
        ({ name }) => name === 'Person'
      )
    ).toMatchObject({ seen: 2, count: 3, unusedProperties: ['address.postcode'] });
  });
});

describe('coverage of a schema composed with allOf', () => {
  const INHERITING: Schema = {
    components: {
      schemas: {
        Base: { type: 'object', properties: { id: { type: 'string' } } },
        Child: {
          allOf: [
            { $ref: '#/components/schemas/Base' },
            { type: 'object', properties: { extra: { type: 'string' } } },
          ],
        },
      },
    },
  };

  function inherited(value: unknown) {
    const coverage = createCoverage();
    walkRoot(INHERITING, coverage, { $ref: '#/components/schemas/Child' }, value);

    return summarize(INHERITING, coverage, { total: 1, withBody: 1 });
  }

  it('credits an inherited property to the schema that declares it', () => {
    const result = inherited({ id: 'a', extra: 'b' });

    expect(result.schemas).toEqual([
      { name: 'Base', reached: true, seen: 1, count: 1, unusedProperties: [], unusedVariants: [] },
      { name: 'Child', reached: true, seen: 1, count: 1, unusedProperties: [], unusedVariants: [] },
    ]);
  });

  it('does not report an inherited property as unused on the inheriting schema', () => {
    expect(inherited({ id: 'a' }).schemas.find(({ name }) => name === 'Child')).toEqual({
      name: 'Child',
      reached: true,
      seen: 0,
      count: 1,
      unusedProperties: ['extra'],
      unusedVariants: [],
    });
  });

  it('does not list a schema the traffic reached as one nothing reached', () => {
    expect(inherited({ id: 'a', extra: 'b' }).unusedSchemas).toEqual([]);
  });
});
