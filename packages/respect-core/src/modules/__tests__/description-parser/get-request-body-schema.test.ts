import { getRequestBodySchema, type OperationDetails } from '../../description-parser';

describe('getRequestBodySchema', () => {
  it('should return the correct schema for a given request body', () => {
    const descriptionOperation = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'integer' },
              },
              required: ['name'],
            },
          },
        },
      },
    } as unknown as OperationDetails & Record<string, any>;

    const schema = getRequestBodySchema('application/json', descriptionOperation);
    expect(schema).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
      },
      required: ['name'],
    });
  });

  it('should return undefined if the content type is not found', () => {
    const descriptionOperation = {
      requestBody: {
        content: {
          'application/xml': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
      },
    } as unknown as OperationDetails & Record<string, any>;

    const schema = getRequestBodySchema('application/json', descriptionOperation);
    expect(schema).toBeUndefined();
  });

  it('should return undefined if descriptionOperation is undefined', () => {
    const schema = getRequestBodySchema('application/json', undefined);
    expect(schema).toBeUndefined();
  });
});
