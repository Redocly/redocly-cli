import { extractSchemaComponents } from '../components.js';
import { type GeneratedDocument, inferSchema, type JsonSchema } from '../generator.js';

type Operation = GeneratedDocument['paths'][string][string];

function makeDocument(paths: GeneratedDocument['paths']): GeneratedDocument {
  return { openapi: '3.1.0', info: { title: 'Test API', version: '1.0.0' }, paths };
}

function jsonOperation(
  operationId: string,
  responseSchema: JsonSchema,
  options: { status?: string; requestSchema?: JsonSchema } = {}
): Operation {
  const operation: Operation = {
    operationId,
    responses: {
      [options.status ?? '200']: {
        description: 'ok',
        content: { 'application/json': { schema: responseSchema } },
      },
    },
  };
  if (options.requestSchema) {
    operation.requestBody = { content: { 'application/json': { schema: options.requestSchema } } };
  }
  return operation;
}

function responseSchema(document: GeneratedDocument, path: string, method = 'get'): JsonSchema {
  const responses = Object.values(document.paths[path][method].responses);
  return responses[0].content!['application/json'].schema;
}

describe('extractSchemaComponents', () => {
  it('extracts a shape repeated across operations and names it after the path entity', () => {
    const document = extractSchemaComponents(
      makeDocument({
        '/users': {
          get: jsonOperation('list', {
            type: 'array',
            items: inferSchema({ id: 1, name: 'Ada', email: 'ada@example.com' }),
          }),
          post: jsonOperation('create', inferSchema({ id: 3, name: 'Linus', email: 'l@e.com' }), {
            status: '201',
          }),
        },
        '/users/{userId}': {
          get: jsonOperation('read', inferSchema({ id: 42, name: 'Ada', email: 'a@e.com' })),
        },
      })
    );

    expect(document.components?.schemas).toEqual({
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
        },
        required: ['id', 'name', 'email'],
      },
    });
    expect(responseSchema(document, '/users')).toEqual({
      type: 'array',
      items: { $ref: '#/components/schemas/User' },
    });
    expect(responseSchema(document, '/users/{userId}')).toEqual({
      $ref: '#/components/schemas/User',
    });
    expect(responseSchema(document, '/users', 'post')).toEqual({
      $ref: '#/components/schemas/User',
    });
  });

  it('groups shapes that differ only in required properties and intersects required', () => {
    const document = extractSchemaComponents(
      makeDocument({
        '/users': {
          get: jsonOperation('list', {
            type: 'object',
            properties: { id: { type: 'integer' }, name: { type: 'string' } },
            required: ['id', 'name'],
          }),
        },
        '/users/{userId}': {
          get: jsonOperation('read', {
            type: 'object',
            properties: { id: { type: 'integer' }, name: { type: 'string' } },
            required: ['id'],
          }),
        },
      })
    );

    expect(document.components?.schemas.User).toEqual({
      type: 'object',
      properties: { id: { type: 'integer' }, name: { type: 'string' } },
      required: ['id'],
    });
  });

  it('unifies near-identical shapes into one component', () => {
    const document = extractSchemaComponents(
      makeDocument({
        '/users': {
          get: jsonOperation('list', inferSchema({ id: 1, name: 'a', email: 'e' })),
        },
        '/users/{userId}': {
          get: jsonOperation(
            'read',
            inferSchema({ id: 1, name: 'a', email: 'e', createdAt: 'now' })
          ),
        },
      })
    );

    expect(Object.keys(document.components?.schemas ?? {})).toEqual(['User']);
    expect(document.components?.schemas.User).toEqual({
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string' },
        createdAt: { type: 'string' },
      },
      required: ['id', 'name', 'email'],
    });
    expect(responseSchema(document, '/users')).toEqual({ $ref: '#/components/schemas/User' });
    expect(responseSchema(document, '/users/{userId}')).toEqual({
      $ref: '#/components/schemas/User',
    });
  });

  it('keeps dissimilar shapes separate and falls back to a Request-suffixed name', () => {
    const request = () => inferSchema({ name: 'Linus', email: 'l@e.com' });
    const response = () => inferSchema({ id: 3, name: 'Linus', email: 'l@e.com' });
    const document = extractSchemaComponents(
      makeDocument({
        '/users': {
          post: jsonOperation('create', response(), { status: '201', requestSchema: request() }),
        },
        '/users/{userId}': {
          put: jsonOperation('update', response(), { requestSchema: request() }),
        },
      })
    );

    expect(Object.keys(document.components?.schemas ?? {})).toEqual(['User', 'UserRequest']);
    expect(document.components?.schemas.UserRequest.properties).toEqual({
      name: { type: 'string' },
      email: { type: 'string' },
    });
    expect(document.paths['/users'].post.requestBody?.content['application/json'].schema).toEqual({
      $ref: '#/components/schemas/UserRequest',
    });
  });

  it('extracts a nested shape shared across different parents and names it after the property', () => {
    const address = () => inferSchema({ street: 'Main St', city: 'Springfield' });
    const document = extractSchemaComponents(
      makeDocument({
        '/users/{userId}': {
          get: jsonOperation('readUser', {
            type: 'object',
            properties: { id: { type: 'integer' }, address: address() },
            required: ['id', 'address'],
          }),
        },
        '/companies/{companyId}': {
          get: jsonOperation('readCompany', {
            type: 'object',
            properties: { vat: { type: 'string' }, address: address() },
            required: ['vat', 'address'],
          }),
        },
      })
    );

    expect(Object.keys(document.components?.schemas ?? {})).toEqual(['Address']);
    expect(responseSchema(document, '/users/{userId}').properties?.address).toEqual({
      $ref: '#/components/schemas/Address',
    });
    expect(responseSchema(document, '/companies/{companyId}').properties?.address).toEqual({
      $ref: '#/components/schemas/Address',
    });
  });

  it('keeps a shape inline when it repeats only because its parent shape repeats', () => {
    const user = () =>
      inferSchema({ id: 1, name: 'a', address: { street: 'Main St', city: 'Springfield' } });
    const document = extractSchemaComponents(
      makeDocument({
        '/users': { get: jsonOperation('list', user()) },
        '/users/{userId}': { get: jsonOperation('read', user()) },
      })
    );

    expect(Object.keys(document.components?.schemas ?? {})).toEqual(['User']);
    expect(document.components?.schemas.User.properties?.address).toEqual({
      type: 'object',
      properties: { street: { type: 'string' }, city: { type: 'string' } },
      required: ['street', 'city'],
    });
  });

  it('names shapes returned by error responses "Error"', () => {
    const problem = () => inferSchema({ code: 'not_found', message: 'Not found' });
    const document = extractSchemaComponents(
      makeDocument({
        '/users/{userId}': {
          get: jsonOperation('readUser', problem(), { status: '404' }),
        },
        '/orders/{orderId}': {
          get: jsonOperation('readOrder', problem(), { status: '404' }),
        },
      })
    );

    expect(Object.keys(document.components?.schemas ?? {})).toEqual(['Error']);
  });

  it('replaces oneOf variants shared across operations with refs', () => {
    const payment = () => ({
      oneOf: [
        inferSchema({ kind: 'card', cardNumber: '41' }),
        inferSchema({ kind: 'bank', iban: 'DE89' }),
      ],
    });
    const document = extractSchemaComponents(
      makeDocument({
        '/payments': { post: jsonOperation('create', payment(), { status: '201' }) },
        '/payments/{paymentId}': { get: jsonOperation('read', payment()) },
      })
    );

    const schemas = document.components?.schemas ?? {};
    expect(Object.keys(schemas)).toEqual(['Payment', 'Payment2']);
    const variants = responseSchema(document, '/payments/{paymentId}').oneOf;
    expect(variants).toHaveLength(2);
    for (const variant of variants ?? []) {
      expect(variant.$ref).toMatch(/^#\/components\/schemas\/Payment2?$/);
    }
  });

  it('references extracted shapes from map values', () => {
    const user = () => inferSchema({ id: 1, name: 'a' });
    const document = extractSchemaComponents(
      makeDocument({
        '/user-index': {
          get: jsonOperation('index', { type: 'object', additionalProperties: user() }),
        },
        '/users/{userId}': { get: jsonOperation('read', user()) },
      })
    );

    expect(Object.keys(document.components?.schemas ?? {})).toEqual(['User']);
    expect(responseSchema(document, '/user-index')).toEqual({
      type: 'object',
      additionalProperties: { $ref: '#/components/schemas/User' },
    });
  });

  it('models a self-similar nested shape as a recursive component', () => {
    const document = extractSchemaComponents(
      makeDocument({
        '/employees/{employeeId}': {
          get: jsonOperation('read', {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string' },
              manager: inferSchema({ id: 2, name: 'b', email: 'm@e.com' }),
            },
            required: ['id', 'name', 'email', 'manager'],
          }),
        },
      })
    );

    expect(Object.keys(document.components?.schemas ?? {})).toEqual(['Employee']);
    const employee = document.components?.schemas.Employee;
    expect(employee?.properties?.manager).toEqual({ $ref: '#/components/schemas/Employee' });
    expect(employee?.required).toEqual(['id', 'name', 'email']);
    expect(responseSchema(document, '/employees/{employeeId}')).toEqual({
      $ref: '#/components/schemas/Employee',
    });
  });

  it('leaves the document untouched when no shape repeats', () => {
    const document = extractSchemaComponents(
      makeDocument({
        '/users/{userId}': {
          get: jsonOperation('read', inferSchema({ id: 1, name: 'a' })),
        },
        '/orders/{orderId}': {
          get: jsonOperation('readOrder', inferSchema({ total: 9.99, currency: 'EUR' })),
        },
      })
    );

    expect(document.components).toBeUndefined();
    expect(responseSchema(document, '/users/{userId}').$ref).toBeUndefined();
  });
});
