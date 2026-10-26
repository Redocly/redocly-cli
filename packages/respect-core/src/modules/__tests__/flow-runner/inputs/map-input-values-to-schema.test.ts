import { resolveInputValuesToSchema } from '../../../flow-runner/index.js';

describe('resolveInputValuesToSchema', () => {
  it.each(['string', 'number', 'array', 'boolean', 'null'])(
    'should warn and preserve named inputs mapped with a non-object schema: %s',
    (type) => {
      const inputs = { 'reusable-test': '123', store_id: '42', my_pet_tags: ['one', 'two'] };
      const logger = { warn: vi.fn() };

      expect(
        resolveInputValuesToSchema(inputs, { type }, { workflowId: 'reusable', logger })
      ).toEqual(inputs);
      expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
        'Workflow "reusable" has a non-object input schema. Named inputs are preserved without validation. Use an object schema to validate named inputs.\n'
      );
    }
  );

  it.each([
    [{}, "must have required property 'key' (#/required)"],
    [{ key: {} }, 'must be string (#/properties/key/type)'],
    [{ key: 'x' }, 'must NOT have fewer than 3 characters (#/properties/key/minLength)'],
  ])('should warn and return invalid inputs: %j', (inputs, message) => {
    const schema = {
      type: 'object',
      required: ['key'],
      properties: {
        key: { type: 'string', minLength: 3 },
        secret: { type: 'string', format: 'password' },
      },
    };

    const logger = { warn: vi.fn() };
    const values = { ...inputs, secret: 'synthetic-secret-sentinel' };
    expect(
      resolveInputValuesToSchema(values, schema, { workflowId: 'create-order', logger })
    ).toEqual(values);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      `Invalid inputs for workflow "create-order": ${message}. Provide values that match the workflow input schema.\n`
    );
  });

  it('should keep supplied property names and values out of diagnostics', () => {
    const logger = { warn: vi.fn() };
    const inputs = { credentials: { 'synthetic-secret-key': { value: 'synthetic-secret-value' } } };
    const schema = {
      type: 'object',
      properties: {
        credentials: { type: 'object', patternProperties: { '.*': { type: 'integer' } } },
      },
    };

    expect(
      resolveInputValuesToSchema(inputs, schema, { workflowId: 'create-order', logger })
    ).toEqual(inputs);
    expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
      'Invalid inputs for workflow "create-order": must be integer (#/properties/credentials/patternProperties/.*/type). Provide values that match the workflow input schema.\n'
    );
  });

  it('should preserve defaults, coercion and removal when validating inputs', () => {
    const logger = { warn: vi.fn() };
    const schema = {
      type: 'object',
      required: ['count', 'name'],
      properties: {
        count: { type: 'integer' },
        name: { type: 'string', default: 'Cafe' },
        optional: { type: 'string' },
      },
    };

    expect(
      resolveInputValuesToSchema({ count: '2', extra: 'removed' }, schema, {
        workflowId: 'create-order',
        logger,
      })
    ).toEqual({
      count: 2,
      name: 'Cafe',
    });
    expect(logger.warn).not.toHaveBeenCalled();
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

    expect(resolveInputValuesToSchema({}, schema)).toEqual({});
  });

  it('should return empty object if schema is empty', () => {
    const values = {
      key: 'value',
    };

    const logger = { warn: vi.fn() };
    expect(resolveInputValuesToSchema(values, {} as any, { workflowId: 'empty', logger })).toEqual(
      {}
    );
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('should return empty object if values and schema are empty', () => {
    expect(resolveInputValuesToSchema({}, {} as any)).toEqual({});
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
