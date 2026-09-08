// The IR is the custom-generator contract: every field below is public API that
// ejected and custom generators read. If this snapshot changes, decide whether the
// change is ADDITIVE (update the snapshot and ship it in any release) or BREAKING
// (a removed/renamed field, or changed semantics), which needs a major release —
// the minor while the package is 0.x. A generator's `requiresGenerator` range is
// resolved against that version, so a breaking change stops incompatible
// generators with the fix path instead of letting them misbehave.

import type { Oas3Definition } from '@redocly/openapi-core';

import { buildApiModel } from '../build.js';

const DOC = {
  openapi: '3.1.0',
  info: { title: 'Contract Probe', version: '1.0.0' },
  servers: [
    {
      url: 'https://api.example.com/{region}',
      description: 'Live server',
      variables: { region: { default: 'us' } },
    },
  ],
  paths: {
    '/orders': {
      get: {
        operationId: 'listOrders',
        tags: ['Orders'],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'X-Trace', in: 'header', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'ok',
            headers: {
              'Pagination-Total': { schema: { type: 'integer' }, required: true },
            },
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } },
              },
            },
          },
          '404': {
            description: 'missing',
            content: { 'application/json': { schema: { type: 'object' } } },
          },
        },
        security: [{ BearerAuth: [] }],
      },
      post: {
        operationId: 'createOrder',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Order' } },
          },
        },
        responses: {
          '201': {
            description: 'created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Order' } },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Order: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', readOnly: true },
          status: { $ref: '#/components/schemas/Status' },
        },
      },
      Status: { type: 'string', enum: ['open', 'shipped'] },
      Pet: {
        oneOf: [{ $ref: '#/components/schemas/Order' }],
        discriminator: { propertyName: 'kind', mapping: { order: '#/components/schemas/Order' } },
      },
    },
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer' },
    },
  },
} as unknown as Oas3Definition;

describe('IR contract shape', () => {
  it('pins the full ApiModel a generator receives for a representative document', () => {
    expect(JSON.parse(JSON.stringify(buildApiModel(DOC)))).toMatchSnapshot();
  });
});
