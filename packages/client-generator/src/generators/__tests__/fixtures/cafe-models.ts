import type { ApiModel, SchemaModel } from '../../../intermediate-representation/model.js';

const STRING: SchemaModel = { kind: 'scalar', scalar: 'string' };

const INT: SchemaModel = { kind: 'scalar', scalar: 'integer' };

// One Cafe model per language. The unit tests and the render tests of that language read it.

export const GO_CAFE: ApiModel = {
  title: 'Cafe',
  version: '1.0.0',
  serverUrl: 'https://api.cafe.example/organizations/unknown',
  servers: [
    {
      url: 'https://api.cafe.example/organizations/{organizationId}',
      description: 'Live server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
    {
      url: 'https://api-sandbox.cafe.example/organizations/{organizationId}',
      description: 'Sandbox server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
  ],
  services: [
    {
      name: 'Orders',
      operations: [
        {
          name: 'listOrders',
          specName: 'listOrders',
          method: 'get',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [
            { name: 'after', in: 'query', required: false, schema: STRING },
            { name: 'limit', in: 'query', required: false, schema: INT },
            {
              name: 'tags',
              in: 'query',
              required: false,
              schema: { kind: 'array', items: STRING },
            },
          ],
          headerParams: [],
          cookieParams: [],
          security: [['BearerAuth']],
          paginationExtension: {
            style: 'cursor',
            cursorParam: 'after',
            nextCursor: '/next',
            items: '/items',
          },
          successResponseHeaders: [
            {
              name: 'pagination-total',
              schema: { kind: 'scalar', scalar: 'integer' },
              required: true,
            },
            { name: 'link', schema: { kind: 'scalar', scalar: 'string' } },
          ],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'OrderPage' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'streamEvents',
          specName: 'streamEvents',
          method: 'get',
          path: '/events',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'text/event-stream',
              schema: { kind: 'object', properties: [] },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'uploadPhoto',
          specName: 'uploadPhoto',
          method: 'post',
          path: '/photos',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'multipart/form-data',
            schema: { kind: 'object', properties: [] },
          },
          successResponses: [{ status: '204', contentType: '', schema: { kind: 'unknown' } }],
          errorResponses: [],
        },
        {
          name: 'getOrder',
          specName: 'getOrder',
          method: 'get',
          path: '/orders/{orderId}',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'createOrder',
          specName: 'createOrder',
          method: 'post',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: { contentType: 'application/json', schema: { kind: 'ref', name: 'Order' } },
          successResponses: [
            {
              status: '201',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
      ],
    },
  ],
  schemas: [
    {
      name: 'Order',
      schema: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
    },
    {
      name: 'OrderPage',
      schema: {
        kind: 'object',
        properties: [
          {
            name: 'items',
            schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
            required: true,
          },
          { name: 'next', schema: STRING, required: false },
        ],
      },
    },
  ],
  securitySchemes: [{ key: 'BearerAuth', kind: 'bearer' }],
} as unknown as ApiModel;

export const PHP_CAFE: ApiModel = {
  title: 'Cafe Orders API',
  version: '1.0.0',
  serverUrl: 'https://api.cafe.example/organizations/unknown',
  servers: [
    {
      url: 'https://api.cafe.example/organizations/{organizationId}',
      description: 'Live server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
    {
      url: 'https://api-sandbox.cafe.example/organizations/{organizationId}',
      description: 'Sandbox server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
  ],
  services: [
    {
      name: 'Orders',
      operations: [
        {
          name: 'listOrders',
          specName: 'listOrders',
          method: 'get',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [
            { name: 'after', in: 'query', required: false, schema: STRING },
            { name: 'limit', in: 'query', required: false, schema: INT },
          ],
          headerParams: [],
          cookieParams: [],
          security: [['BearerAuth']],
          paginationExtension: {
            style: 'cursor',
            cursorParam: 'after',
            nextCursor: '/next',
            items: '/items',
          },
          successResponseHeaders: [
            {
              name: 'pagination-total',
              schema: { kind: 'scalar', scalar: 'integer' },
              required: true,
            },
            { name: 'link', schema: { kind: 'scalar', scalar: 'string' } },
          ],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'OrderPage' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'getOrder',
          specName: 'getOrder',
          method: 'get',
          path: '/orders/{orderId}',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'getOrderPdf',
          specName: 'getOrderPdf',
          method: 'get',
          path: '/orders/{orderId}/pdf',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/pdf',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'createOrder',
          specName: 'createOrder',
          method: 'post',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'application/json',
            required: true,
            schema: { kind: 'ref', name: 'Order' },
          },
          successResponses: [
            {
              status: '201',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'streamEvents',
          specName: 'streamEvents',
          method: 'get',
          path: '/events',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'text/event-stream',
              schema: { kind: 'object', properties: [] },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'uploadPhoto',
          specName: 'uploadPhoto',
          method: 'post',
          path: '/photos',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'multipart/form-data',
            required: true,
            schema: { kind: 'object', properties: [] },
          },
          successResponses: [{ status: '204', contentType: '', schema: { kind: 'unknown' } }],
          errorResponses: [],
        },
      ],
    },
  ],
  schemas: [
    {
      name: 'Order',
      schema: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
    },
    {
      name: 'OrderPage',
      schema: {
        kind: 'object',
        properties: [
          {
            name: 'items',
            schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
            required: true,
          },
          { name: 'next', schema: STRING, required: false },
        ],
      },
    },
  ],
  securitySchemes: [{ key: 'BearerAuth', kind: 'bearer' }],
} as unknown as ApiModel;

export const JAVA_CAFE: ApiModel = {
  title: 'Cafe Orders API',
  version: '1.0.0',
  serverUrl: 'https://api.cafe.example/organizations/unknown',
  servers: [
    {
      url: 'https://api.cafe.example/organizations/{organizationId}',
      description: 'Live server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
    {
      url: 'https://api-sandbox.cafe.example/organizations/{organizationId}',
      description: 'Sandbox server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
  ],
  services: [
    {
      name: 'Orders',
      operations: [
        {
          name: 'listOrders',
          specName: 'listOrders',
          method: 'get',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [
            { name: 'after', in: 'query', required: false, schema: STRING },
            { name: 'limit', in: 'query', required: false, schema: INT },
            {
              name: 'tags',
              in: 'query',
              required: false,
              schema: { kind: 'array', items: STRING },
            },
          ],
          headerParams: [],
          cookieParams: [],
          security: [['BearerAuth']],
          paginationExtension: {
            style: 'cursor',
            cursorParam: 'after',
            nextCursor: '/next',
            items: '/items',
          },
          successResponseHeaders: [
            {
              name: 'pagination-total',
              schema: { kind: 'scalar', scalar: 'integer' },
              required: true,
            },
            { name: 'link', schema: { kind: 'scalar', scalar: 'string' } },
          ],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'OrderPage' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'getOrder',
          specName: 'getOrder',
          method: 'get',
          path: '/orders/{orderId}',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'getOrderPdf',
          specName: 'getOrderPdf',
          method: 'get',
          path: '/orders/{orderId}/pdf',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/pdf',
              schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'createOrder',
          specName: 'createOrder',
          method: 'post',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'application/json',
            required: true,
            schema: { kind: 'ref', name: 'Order' },
          },
          successResponses: [
            {
              status: '201',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'streamEvents',
          specName: 'streamEvents',
          method: 'get',
          path: '/events',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'text/event-stream',
              schema: { kind: 'object', properties: [] },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'uploadPhoto',
          specName: 'uploadPhoto',
          method: 'post',
          path: '/photos',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'multipart/form-data',
            required: true,
            schema: { kind: 'object', properties: [] },
          },
          successResponses: [{ status: '204', contentType: '', schema: { kind: 'unknown' } }],
          errorResponses: [],
        },
      ],
    },
  ],
  schemas: [
    {
      name: 'Order',
      schema: { kind: 'object', properties: [{ name: 'id', schema: STRING, required: true }] },
    },
    {
      name: 'OrderPage',
      schema: {
        kind: 'object',
        properties: [
          {
            name: 'items',
            schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
            required: true,
          },
          { name: 'next', schema: STRING, required: false },
        ],
      },
    },
  ],
  securitySchemes: [{ key: 'BearerAuth', kind: 'bearer' }],
} as unknown as ApiModel;

export const PYTHON_CAFE: ApiModel = {
  title: 'Cafe',
  version: '1.0.0',
  serverUrl: 'https://api.cafe.example/organizations/unknown',
  servers: [
    {
      url: 'https://api.cafe.example/organizations/{organizationId}',
      description: 'Live server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
    {
      url: 'https://api-sandbox.cafe.example/organizations/{organizationId}',
      description: 'Sandbox server',
      variables: [{ name: 'organizationId', default: 'unknown' }],
    },
  ],
  services: [
    {
      name: 'Orders',
      operations: [
        {
          name: 'listOrders',
          specName: 'listOrders',
          method: 'get',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [
            { name: 'after', in: 'query', required: false, schema: STRING },
            { name: 'limit', in: 'query', required: false, schema: INT },
          ],
          headerParams: [],
          cookieParams: [],
          security: [['BearerAuth']],
          paginationExtension: {
            style: 'cursor',
            cursorParam: 'after',
            nextCursor: '/next',
            items: '/items',
          },
          successResponseHeaders: [
            {
              name: 'pagination-total',
              schema: { kind: 'scalar', scalar: 'integer' },
              required: true,
            },
            { name: 'link', schema: { kind: 'scalar', scalar: 'string' } },
          ],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'OrderPage' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'streamEvents',
          specName: 'streamEvents',
          method: 'get',
          path: '/events',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'text/event-stream',
              schema: { kind: 'object', properties: [] },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'uploadPhoto',
          specName: 'uploadPhoto',
          method: 'post',
          path: '/photos',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: {
            contentType: 'multipart/form-data',
            schema: { kind: 'object', properties: [] },
          },
          successResponses: [{ status: '204', contentType: '', schema: { kind: 'unknown' } }],
          errorResponses: [],
        },
        {
          name: 'getOrder',
          specName: 'getOrder',
          method: 'get',
          path: '/orders/{orderId}',
          tags: ['Orders'],
          pathParams: [{ name: 'orderId', in: 'path', required: true, schema: STRING }],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
        {
          name: 'createOrder',
          specName: 'createOrder',
          method: 'post',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [],
          requestBody: { contentType: 'application/json', schema: { kind: 'ref', name: 'Order' } },
          successResponses: [
            {
              status: '201',
              contentType: 'application/json',
              schema: { kind: 'ref', name: 'Order' },
            },
          ],
          errorResponses: [],
        },
      ],
    },
  ],
  schemas: [
    {
      name: 'Order',
      schema: {
        kind: 'object',
        properties: [{ name: 'id', schema: STRING, required: true }],
      },
    },
    {
      name: 'OrderPage',
      schema: {
        kind: 'object',
        properties: [
          {
            name: 'items',
            schema: { kind: 'array', items: { kind: 'ref', name: 'Order' } },
            required: true,
          },
          { name: 'next', schema: STRING, required: false },
        ],
      },
    },
  ],
  securitySchemes: [{ key: 'BearerAuth', kind: 'bearer' }],
} as unknown as ApiModel;
