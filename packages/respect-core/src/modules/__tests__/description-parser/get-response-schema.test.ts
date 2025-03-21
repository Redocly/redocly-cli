import { getResponseSchema } from '../../description-parser/index.js';

describe('getResponseSchema', () => {
  it('should return undefined if descriptionResponses is not provided', () => {
    const result = getResponseSchema({
      statusCode: 200,
      contentType: 'application/json',
    });
    expect(result).toBeUndefined();
  });

  it('should return undefined if statusCode is not found and no default response is provided', () => {
    const result = getResponseSchema({
      statusCode: 404,
      contentType: 'application/json',
      descriptionResponses: {
        200: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    });
    expect(result).toBeUndefined();
  });

  it('should return the schema for the given statusCode and contentType', () => {
    const result = getResponseSchema({
      statusCode: 200,
      contentType: 'application/json',
      descriptionResponses: {
        200: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    });
    expect(result).toEqual({ type: 'object' });
  });

  it('should return the schema for the default response if statusCode is not found', () => {
    const result = getResponseSchema({
      statusCode: 404,
      contentType: 'application/json',
      descriptionResponses: {
        default: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    });
    expect(result).toEqual({ type: 'object' });
  });

  it('should return undefined if contentType is not found in the response content', () => {
    const result = getResponseSchema({
      statusCode: 200,
      contentType: 'application/xml',
      descriptionResponses: {
        200: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    });
    expect(result).toBeUndefined();
  });

  it('should return the schema for the default response if statusCode is not found and contentType matches', () => {
    const result = getResponseSchema({
      statusCode: 404,
      contentType: 'application/json',
      descriptionResponses: {
        default: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    });
    expect(result).toEqual({ type: 'object' });
  });

  it('should return undefined if neither statusCode nor default response is found', () => {
    const result = getResponseSchema({
      statusCode: 404,
      contentType: 'application/json',
      descriptionResponses: {
        200: {
          content: {
            'application/json': {
              schema: { type: 'object' },
            },
          },
        },
      },
    });
    expect(result).toBeUndefined();
  });
});
