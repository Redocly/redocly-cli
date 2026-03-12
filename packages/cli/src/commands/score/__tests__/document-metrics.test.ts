import { collectDocumentMetrics } from './collect-metrics.js';

function makeDoc(paths: Record<string, unknown>, components?: Record<string, unknown>) {
  return {
    openapi: '3.0.0',
    info: { title: 'Test', version: '1.0.0' },
    paths,
    ...(components ? { components } : {}),
  };
}

describe('collectDocumentMetrics', () => {
  it('should return zero operations for empty paths', async () => {
    const result = await collectDocumentMetrics(makeDoc({}));
    expect(result.operationCount).toBe(0);
    expect(result.operations.size).toBe(0);
  });

  it('should count operations across methods', async () => {
    const doc = makeDoc({
      '/items': {
        get: { operationId: 'listItems', responses: { '200': { description: 'OK' } } },
        post: { operationId: 'createItem', responses: { '201': { description: 'Created' } } },
      },
      '/items/{id}': {
        get: { operationId: 'getItem', responses: { '200': { description: 'OK' } } },
        delete: { operationId: 'deleteItem', responses: { '204': { description: 'Deleted' } } },
      },
    });
    const result = await collectDocumentMetrics(doc);
    expect(result.operationCount).toBe(4);
  });

  it('should use operationId as key when present', async () => {
    const doc = makeDoc({
      '/items': {
        get: { operationId: 'listItems', responses: { '200': { description: 'OK' } } },
      },
    });
    const result = await collectDocumentMetrics(doc);
    expect(result.operations.has('listItems')).toBe(true);
  });

  it('should fall back to METHOD path as key when no operationId', async () => {
    const doc = makeDoc({
      '/items': {
        get: { responses: { '200': { description: 'OK' } } },
      },
    });
    const result = await collectDocumentMetrics(doc);
    expect(result.operations.has('GET /items')).toBe(true);
  });

  describe('parameter counting', () => {
    it('should count resolved parameters via $ref', async () => {
      const doc = makeDoc(
        {
          '/items': {
            get: {
              operationId: 'listItems',
              parameters: [
                { $ref: '#/components/parameters/Limit' },
                { $ref: '#/components/parameters/Offset' },
              ],
              responses: { '200': { description: 'OK' } },
            },
          },
        },
        {
          parameters: {
            Limit: {
              name: 'limit',
              in: 'query',
              required: false,
              description: 'Max items',
              schema: { type: 'integer' },
            },
            Offset: { name: 'offset', in: 'query', schema: { type: 'integer' } },
          },
        }
      );
      const result = await collectDocumentMetrics(doc);
      const op = result.operations.get('listItems')!;
      expect(op.parameterCount).toBe(2);
      expect(op.paramsWithDescription).toBe(1);
    });

    it('should merge path-level and operation-level parameters', async () => {
      const doc = makeDoc({
        '/items/{id}': {
          parameters: [{ name: 'id', in: 'path', required: true, description: 'Item ID' }],
          get: {
            operationId: 'getItem',
            parameters: [{ name: 'fields', in: 'query' }],
            responses: { '200': { description: 'OK' } },
          },
        },
      });
      const op = (await collectDocumentMetrics(doc)).operations.get('getItem')!;
      expect(op.parameterCount).toBe(2);
      expect(op.requiredParameterCount).toBe(1);
    });

    it('should let operation params override path params with same name+in', async () => {
      const doc = makeDoc({
        '/items/{id}': {
          parameters: [{ name: 'id', in: 'path', required: true }],
          get: {
            operationId: 'getItem',
            parameters: [{ name: 'id', in: 'path', required: true, description: 'Overridden' }],
            responses: { '200': { description: 'OK' } },
          },
        },
      });
      const op = (await collectDocumentMetrics(doc)).operations.get('getItem')!;
      expect(op.parameterCount).toBe(1);
      expect(op.paramsWithDescription).toBe(1);
    });

    it('should detect ambiguous params without description', async () => {
      const doc = makeDoc({
        '/items': {
          get: {
            operationId: 'listItems',
            parameters: [
              { name: 'id', in: 'query' },
              { name: 'type', in: 'query' },
              { name: 'category', in: 'query', description: 'Filter category' },
            ],
            responses: { '200': { description: 'OK' } },
          },
        },
      });
      const op = (await collectDocumentMetrics(doc)).operations.get('listItems')!;
      expect(op.ambiguousIdentifierCount).toBe(2);
    });
  });

  describe('request body', () => {
    it('should detect request body and resolve schema $ref', async () => {
      const doc = makeDoc(
        {
          '/items': {
            post: {
              operationId: 'createItem',
              requestBody: {
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Item' },
                    example: { name: 'test' },
                  },
                },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
        {
          schemas: {
            Item: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Item name', minLength: 1 },
                price: { type: 'integer', minimum: 0 },
              },
            },
          },
        }
      );
      const op = (await collectDocumentMetrics(doc)).operations.get('createItem')!;
      expect(op.requestBodyPresent).toBe(true);
      expect(op.requestExamplePresent).toBe(true);
      expect(op.propertyCount).toBe(2);
      expect(op.constraintCount).toBe(2);
      expect(op.totalSchemaProperties).toBe(2);
      expect(op.schemaPropertiesWithDescription).toBe(1);
    });

    it('should resolve requestBody $ref', async () => {
      const doc = makeDoc(
        {
          '/items': {
            post: {
              operationId: 'createItem',
              requestBody: { $ref: '#/components/requestBodies/ItemBody' },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
        {
          requestBodies: {
            ItemBody: {
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { name: { type: 'string' } } },
                },
              },
            },
          },
        }
      );
      const op = (await collectDocumentMetrics(doc)).operations.get('createItem')!;
      expect(op.requestBodyPresent).toBe(true);
      expect(op.propertyCount).toBe(1);
    });
  });

  describe('responses', () => {
    it('should resolve response $refs and count structured errors', async () => {
      const doc = makeDoc(
        {
          '/items': {
            get: {
              operationId: 'listItems',
              responses: {
                '200': { description: 'OK' },
                '400': { $ref: '#/components/responses/BadRequest' },
                '500': { $ref: '#/components/responses/ServerError' },
              },
            },
          },
        },
        {
          responses: {
            BadRequest: {
              description: 'Bad request',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
            ServerError: {
              description: 'Server error',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
        }
      );
      const op = (await collectDocumentMetrics(doc)).operations.get('listItems')!;
      expect(op.totalErrorResponses).toBe(2);
      expect(op.structuredErrorResponseCount).toBe(2);
    });

    it('should count description-only error responses as structured', async () => {
      const doc = makeDoc({
        '/items': {
          get: {
            operationId: 'listItems',
            responses: {
              '200': { description: 'OK' },
              '404': { description: 'Not found' },
            },
          },
        },
      });
      const op = (await collectDocumentMetrics(doc)).operations.get('listItems')!;
      expect(op.totalErrorResponses).toBe(1);
      expect(op.structuredErrorResponseCount).toBe(1);
    });

    it('should count default as error response', async () => {
      const doc = makeDoc({
        '/items': {
          get: {
            operationId: 'listItems',
            responses: {
              '200': { description: 'OK' },
              default: { description: 'Error' },
            },
          },
        },
      });
      const op = (await collectDocumentMetrics(doc)).operations.get('listItems')!;
      expect(op.totalErrorResponses).toBe(1);
    });

    it('should detect response examples and compute schema depth', async () => {
      const doc = makeDoc({
        '/items': {
          get: {
            operationId: 'listItems',
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        items: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: { name: { type: 'string' } },
                          },
                        },
                      },
                    },
                    example: { items: [{ name: 'test' }] },
                  },
                },
              },
            },
          },
        },
      });
      const op = (await collectDocumentMetrics(doc)).operations.get('listItems')!;
      expect(op.responseExamplePresent).toBe(true);
      expect(op.maxResponseSchemaDepth).toBe(3);
    });
  });

  describe('schema property examples as coverage', () => {
    it('should count schema property examples towards response example coverage', async () => {
      const doc = makeDoc(
        {
          '/items': {
            get: {
              operationId: 'listItems',
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/Item' },
                    },
                  },
                },
              },
            },
          },
        },
        {
          schemas: {
            Item: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'abc123' },
              },
            },
          },
        }
      );
      const op = (await collectDocumentMetrics(doc)).operations.get('listItems')!;
      expect(op.responseExamplePresent).toBe(true);
    });
  });

  describe('description and misc', () => {
    it('should detect operation description presence', async () => {
      const doc = makeDoc({
        '/a': {
          get: {
            operationId: 'withDesc',
            description: 'Has description',
            responses: { '200': { description: 'OK' } },
          },
        },
        '/b': {
          get: {
            operationId: 'noDesc',
            responses: { '200': { description: 'OK' } },
          },
        },
      });
      const metrics = await collectDocumentMetrics(doc);
      expect(metrics.operations.get('withDesc')!.operationDescriptionPresent).toBe(true);
      expect(metrics.operations.get('noDesc')!.operationDescriptionPresent).toBe(false);
    });

    it('should collect refs used across operations', async () => {
      const doc = makeDoc(
        {
          '/items': {
            get: {
              operationId: 'listItems',
              responses: {
                '200': {
                  description: 'OK',
                  content: {
                    'application/json': { schema: { $ref: '#/components/schemas/Item' } },
                  },
                },
              },
            },
            post: {
              operationId: 'createItem',
              requestBody: {
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
              },
              responses: { '201': { description: 'Created' } },
            },
          },
        },
        { schemas: { Item: { type: 'object' } } }
      );
      const metrics = await collectDocumentMetrics(doc);
      expect(metrics.operations.get('listItems')!.refsUsed.has('#/components/schemas/Item')).toBe(
        true
      );
      expect(metrics.operations.get('createItem')!.refsUsed.has('#/components/schemas/Item')).toBe(
        true
      );
    });

    it('should handle empty paths gracefully', async () => {
      expect(
        (
          await collectDocumentMetrics({
            openapi: '3.0.0',
            info: { title: 'T', version: '1' },
            paths: {},
          })
        ).operationCount
      ).toBe(0);
    });
  });
});
