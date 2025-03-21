import { removeWriteOnlyProperties } from '../../description-parser/index.js';

describe('removeWriteOnlyProperties', () => {
  it('should remove writeOnly properties', () => {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          writeOnly: true,
        },
        name: {
          type: 'string',
        },
      },
      required: ['id', 'name'],
    } as any;

    const result = removeWriteOnlyProperties(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      required: ['name'],
    });
  });

  it('should remove writeOnly properties from nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          writeOnly: true,
        },
        name: {
          type: 'string',
        },
        nested: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              writeOnly: true,
            },
            name: {
              type: 'string',
            },
          },
          required: ['id', 'name'],
        },
      },
      required: ['id', 'name'],
    } as any;

    const result = removeWriteOnlyProperties(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        nested: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        },
      },
      required: ['name'],
    });
  });

  it('should remove writeOnly properties from nested arrays', () => {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          writeOnly: true,
        },
        name: {
          type: 'string',
        },
        nested: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                writeOnly: true,
              },
              name: {
                type: 'string',
              },
            },
            required: ['id', 'name'],
          },
        },
      },
      required: ['id', 'name'],
    } as any;

    const result = removeWriteOnlyProperties(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        nested: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
            required: ['name'],
          },
        },
      },
      required: ['name'],
    });
  });

  it('should remove writeOnly properties from additionalProperties', () => {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          writeOnly: true,
        },
        name: {
          type: 'string',
        },
      },
      additionalProperties: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            writeOnly: true,
          },
          name: {
            type: 'string',
          },
        },
        required: ['id', 'name'],
      },
      required: ['id', 'name'],
    } as any;

    const result = removeWriteOnlyProperties(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      additionalProperties: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
        required: ['name'],
      },
      required: ['name'],
    });
  });

  it('should remove writeOnly properties from oneOf', () => {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          writeOnly: true,
        },
        name: {
          type: 'string',
        },
      },
      oneOf: [
        {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              writeOnly: true,
            },
            name: {
              type: 'string',
            },
          },
          required: ['id', 'name'],
        },
      ],
      required: ['id', 'name'],
    } as any;

    const result = removeWriteOnlyProperties(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      oneOf: [
        {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        },
      ],
      required: ['name'],
    });
  });

  it('should remove writeOnly properties from allOf', () => {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          writeOnly: true,
        },
        name: {
          type: 'string',
        },
      },
      allOf: [
        {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              writeOnly: true,
            },
            name: {
              type: 'string',
            },
          },
          required: ['id', 'name'],
        },
      ],
      required: ['id', 'name'],
    } as any;

    const result = removeWriteOnlyProperties(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      allOf: [
        {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        },
      ],
      required: ['name'],
    });
  });

  it('should remove writeOnly properties from anyOf', () => {
    const schema = {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          writeOnly: true,
        },
        name: {
          type: 'string',
        },
      },
      anyOf: [
        {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              writeOnly: true,
            },
            name: {
              type: 'string',
            },
          },
          required: ['id', 'name'],
        },
      ],
      required: ['id', 'name'],
    } as any;

    const result = removeWriteOnlyProperties(schema);

    expect(result).toEqual({
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
      },
      anyOf: [
        {
          type: 'object',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        },
      ],
      required: ['name'],
    });
  });
});
