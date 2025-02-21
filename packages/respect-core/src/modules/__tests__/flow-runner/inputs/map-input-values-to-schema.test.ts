import { resolveInputValuesToSchema } from '../../../flow-runner';

describe('resolveInputValuesToSchema', () => {
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

    expect(resolveInputValuesToSchema(values, {} as any)).toEqual({});
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
