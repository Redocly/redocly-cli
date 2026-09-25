import type {
  CoverageItem,
  NormalizedExchange,
  OpenApiIndex,
  OpenApiOperation,
} from '../../types/index.js';
import { CoverageCollector } from '../coverage-collector.js';
import { SchemaValidator } from '../schema-validator.js';

const itemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', readOnly: true },
    createdAt: { allOf: [{ type: 'string' }, { readOnly: true }] },
    name: { type: 'string' },
    price: {
      type: 'object',
      properties: { amount: { type: 'number' }, currency: { type: 'string' } },
    },
    details: {
      oneOf: [
        {
          type: 'object',
          required: ['kind', 'pages'],
          properties: { kind: { const: 'book' }, pages: { type: 'integer' } },
        },
        {
          type: 'object',
          required: ['kind', 'duration'],
          properties: { kind: { const: 'music' }, duration: { type: 'integer' } },
        },
      ],
    },
  },
};

const createItem: OpenApiOperation = {
  operationId: 'createItem',
  method: 'post',
  pathTemplate: '/items',
  pathRegex: /^\/items$/,
  pathParams: [],
  pathScore: 2,
  servers: [],
  requestParameters: [
    { name: 'dryRun', in: 'query', required: false },
    { name: 'session', in: 'cookie', required: false },
  ],
  requestBodyContent: { 'application/json': itemSchema },
  requestBodyRequired: true,
  responseStatuses: ['201', '400'],
  responseBodyContent: { '201': { 'application/json': itemSchema } },
  security: undefined,
  securitySchemes: {},
  specSource: 'openapi.yaml',
};

const deleteItem: OpenApiOperation = {
  ...createItem,
  operationId: 'deleteItem',
  method: 'delete',
  pathTemplate: '/items/{id}',
  pathRegex: /^\/items\/([^/]+)$/,
  pathParams: ['id'],
  requestParameters: [{ name: 'id', in: 'path', required: true }],
  requestBodyContent: {},
  requestBodyRequired: false,
  responseStatuses: ['204'],
  responseBodyContent: {},
};

const openApiIndex: OpenApiIndex = {
  operationsByMethod: new Map([
    ['post', [createItem]],
    ['delete', [deleteItem]],
  ]),
  loadedSpecs: 1,
  loadedOperations: 2,
};

function createExchange(
  index: number,
  requestBody: unknown,
  status: number,
  responseBody: unknown
): NormalizedExchange {
  const url = new URL('https://api.example.com/items');
  return {
    index,
    source: 'test',
    request: {
      method: 'POST',
      url: url.toString(),
      path: url.pathname,
      query: url.searchParams,
      protocol: url.protocol,
      protocolKnown: true,
      host: url.host,
      headers: { 'content-type': 'application/json' },
      contentType: 'application/json',
      bodyText: JSON.stringify(requestBody),
      bodyJson: requestBody,
    },
    response: {
      status,
      headers: { 'content-type': 'application/json' },
      contentType: 'application/json',
      bodyText: JSON.stringify(responseBody),
      bodyJson: responseBody,
    },
  };
}

describe('CoverageCollector', () => {
  it('tracks operations, parameters, response codes, and properties of the matched branch', () => {
    const schemaValidator = new SchemaValidator();
    const collector = new CoverageCollector({
      openApiIndex,
      ignoreCookies: true,
      validateSchema: (schema, value, options) =>
        schemaValidator.validate(schema, value, options?.target),
    });

    collector.record(
      createExchange(0, { name: 'Dune', details: { kind: 'book', pages: 412 } }, 201, {
        id: '1',
        name: 'Dune',
        price: { amount: 9 },
        details: { kind: 'book', pages: 412 },
      }),
      { operation: createItem, pathParams: {} },
      {}
    );
    collector.record(
      createExchange(1, { name: 'Broken', price: { currency: 'USD' } }, 400, {
        message: 'amount is required',
      }),
      { operation: createItem, pathParams: {} },
      {}
    );
    collector.record(createExchange(2, undefined, 404, undefined), null, {});

    expect(collector.finalize()).toMatchInlineSnapshot(`
      {
        "exchanges": {
          "matched": 2,
          "total": 3,
          "withBody": 2,
        },
        "operations": [
          {
            "covered": [
              {
                "kind": "operation",
              },
              {
                "kind": "property",
                "path": "name",
                "target": "request",
              },
              {
                "kind": "property",
                "path": "price",
                "target": "request",
              },
              {
                "kind": "property",
                "path": "price.currency",
                "target": "request",
              },
              {
                "kind": "property",
                "path": "details",
                "target": "request",
              },
              {
                "kind": "property",
                "path": "details.kind",
                "target": "request",
              },
              {
                "kind": "property",
                "path": "details.pages",
                "target": "request",
              },
              {
                "kind": "response",
                "status": "201",
              },
              {
                "kind": "property",
                "path": "id",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "name",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "price",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "price.amount",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "details",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "details.kind",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "details.pages",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "response",
                "status": "400",
              },
            ],
            "method": "POST",
            "missing": [
              {
                "in": "query",
                "kind": "parameter",
                "name": "dryRun",
              },
              {
                "kind": "property",
                "path": "price.amount",
                "target": "request",
              },
              {
                "kind": "property",
                "path": "details.duration",
                "target": "request",
              },
              {
                "kind": "property",
                "path": "createdAt",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "price.currency",
                "status": "201",
                "target": "response",
              },
              {
                "kind": "property",
                "path": "details.duration",
                "status": "201",
                "target": "response",
              },
            ],
            "operationId": "createItem",
            "path": "/items",
          },
          {
            "covered": [],
            "method": "DELETE",
            "missing": [
              {
                "kind": "operation",
              },
              {
                "in": "path",
                "kind": "parameter",
                "name": "id",
              },
              {
                "kind": "response",
                "status": "204",
              },
            ],
            "operationId": "deleteItem",
            "path": "/items/{id}",
          },
        ],
        "totals": {
          "operations": {
            "covered": 1,
            "total": 2,
          },
          "overall": {
            "covered": 16,
            "total": 25,
          },
          "parameters": {
            "covered": 0,
            "total": 2,
          },
          "properties": {
            "covered": 13,
            "total": 18,
          },
          "responses": {
            "covered": 2,
            "total": 3,
          },
        },
      }
    `);
  });

  it('credits the properties of every branch when the payload matches none of them', () => {
    const schemaValidator = new SchemaValidator();
    const collector = new CoverageCollector({
      openApiIndex,
      ignoreCookies: false,
      validateSchema: (schema, value, options) =>
        schemaValidator.validate(schema, value, options?.target),
    });

    collector.record(
      createExchange(0, { name: 'Dune', details: { kind: 'book', pages: 'many' } }, 400, {
        message: 'pages must be an integer',
      }),
      { operation: createItem, pathParams: {} },
      {}
    );

    const coverage = collector.finalize().operations[0];
    const requestProperties = (list: CoverageItem[]) =>
      list.flatMap((item) =>
        item.kind === 'property' && item.target === 'request' ? [item.path] : []
      );

    expect(requestProperties(coverage.covered)).toEqual([
      'name',
      'details',
      'details.kind',
      'details.pages',
    ]);
    expect(requestProperties(coverage.missing)).toEqual([
      'price',
      'price.amount',
      'price.currency',
      'details.duration',
    ]);
  });
});
