import { resolveInputValuesToSchema } from '../../../flow-runner/index.js';

describe('resolveInputValuesToSchema', () => {
  it.each([
    [{}, "inputs must have required property 'key'"],
    [{ key: {} }, 'inputs/key must be string'],
    [{ key: 'x' }, 'inputs/key must NOT have fewer than 3 characters'],
  ])('should reject invalid inputs when validation is requested: %j', (inputs, message) => {
    const schema = {
      type: 'object',
      required: ['key'],
      properties: {
        key: { type: 'string', minLength: 3 },
        secret: { type: 'string', format: 'password' },
      },
    };

    expect(() =>
      resolveInputValuesToSchema({ ...inputs, secret: 'synthetic-secret-sentinel' }, schema, true)
    ).toThrow(
      new Error(
        `Invalid workflow inputs: ${message}. Provide values that match the workflow input schema.`
      )
    );
  });

  it('should preserve defaults, coercion and removal when validating inputs', () => {
    const schema = {
      type: 'object',
      required: ['count', 'name'],
      properties: {
        count: { type: 'integer' },
        name: { type: 'string', default: 'Cafe' },
        optional: { type: 'string' },
      },
    };

    expect(resolveInputValuesToSchema({ count: '2', extra: 'removed' }, schema, true)).toEqual({
      count: 2,
      name: 'Cafe',
    });
  });

  it('should return empty object if values is empty', () => {
    const schema = {
      type: 'object',
      properties: {
        key: {
          type: 'string',
        },
      },
    };

    expect(resolveInputValuesToSchema({}, schema, true)).toEqual({});
  });

  it('should return empty object if schema is empty', () => {
    const values = {
      key: 'value',
    };

    expect(resolveInputValuesToSchema(values, {} as any, true)).toEqual({});
  });

  it('should return empty object if values and schema are empty', () => {
    expect(resolveInputValuesToSchema({}, {} as any, true)).toEqual({});
  });

  it('should return mapped object if values and schema are provided', () => {
    const values = {
      key: 'value',
      key2: 'value2',
    };
    const schema = {
      type: 'object',
      properties: {
        key: {
          type: 'string',
        },
        key2: {
          type: 'string',
        },
      },
    };

    expect(resolveInputValuesToSchema(values, schema)).toEqual({ key: 'value', key2: 'value2' });
  });

  it('should return only map values defined in the schema', () => {
    const values = {
      key: 'value',
      key2: 'value2',
    };
    const schema = {
      type: 'object',
      properties: {
        key: {
          type: 'string',
        },
      },
    };

    expect(resolveInputValuesToSchema(values, schema)).toEqual({ key: 'value' });
  });

  it('should return mapped nested values defined in the schema', () => {
    const values = {
      username: 'value',
      password: 'value2',
      info: {
        home: 'home',
        work: 'work',
        car: {
          type: 'heavy',
          brand: 'some',
          minSpeed: 0,
        },
      },
    };
    const schema = {
      type: 'object',
      properties: {
        username: {
          type: 'string',
        },
        password: {
          type: 'string',
        },
        info: {
          type: 'object',
          properties: {
            home: {
              type: 'string',
            },
            work: {
              type: 'string',
            },
            car: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                },
                maxSpeed: {
                  type: 'number',
                },
              },
            },
          },
        },
      },
    };

    expect(resolveInputValuesToSchema(values, schema)).toEqual({
      username: 'value',
      password: 'value2',
      info: { home: 'home', work: 'work', car: { type: 'heavy' } },
    });
  });
});
