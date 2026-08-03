import type { ApiModel } from '../../intermediate-representation/model.js';
import { descriptorStatements, packageIdents, renderDescriptors } from '../descriptor.js';
import { resolveModelPagination } from '../pagination.js';
import { printStatements } from '../ts.js';

// Equivalence against the AST printer across the descriptor vocabulary: param styles,
// every security kind, multipart bodies, SSE, pagination, tags, and a renamed ident.
const MODEL = {
  title: 'Cafe',
  version: '1.0.0',
  services: [
    {
      name: 'Default',
      operations: [
        {
          name: 'listOrders',
          specName: 'listOrders',
          method: 'get',
          path: '/orders',
          tags: ['Orders'],
          pathParams: [],
          queryParams: [
            {
              name: 'after',
              in: 'query',
              required: false,
              schema: { kind: 'scalar', scalar: 'string' },
            },
            {
              name: 'filter',
              in: 'query',
              required: false,
              style: 'deepObject',
              explode: true,
              schema: { kind: 'record', value: { kind: 'scalar', scalar: 'string' } },
            },
          ],
          headerParams: [
            {
              name: 'X-Trace',
              in: 'header',
              required: false,
              allowReserved: true,
              schema: { kind: 'scalar', scalar: 'string' },
            },
          ],
          cookieParams: [],
          security: [['Bearer'], ['HeaderKey', 'CookieKey']],
          paginationExtension: {
            style: 'cursor',
            cursorParam: 'after',
            nextCursor: '/next',
            items: '/items',
          },
          successResponses: [
            {
              status: '200',
              contentType: 'application/json',
              schema: {
                kind: 'object',
                properties: [
                  {
                    name: 'items',
                    schema: { kind: 'array', items: { kind: 'scalar', scalar: 'string' } },
                    required: true,
                  },
                  { name: 'next', schema: { kind: 'scalar', scalar: 'string' }, required: false },
                ],
              },
            },
          ],
          errorResponses: [],
        },
        {
          // Collides with wiring — packageIdents renames it.
          name: 'configure',
          specName: 'configure',
          method: 'post',
          path: '/configure',
          tags: [],
          pathParams: [],
          queryParams: [],
          headerParams: [],
          cookieParams: [],
          security: [['QueryKey']],
          requestBody: {
            contentType: 'multipart/form-data',
            required: true,
            schema: {
              kind: 'object',
              properties: [
                {
                  name: 'photo',
                  schema: { kind: 'scalar', scalar: 'string', metadata: { format: 'binary' } },
                  required: true,
                },
              ],
            },
          },
          successResponses: [],
          errorResponses: [],
        },
        {
          name: 'streamEvents',
          specName: 'streamEvents',
          method: 'get',
          path: '/events',
          tags: [],
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
      ],
    },
  ],
  schemas: [],
  securitySchemes: [
    { key: 'Bearer', kind: 'bearer' },
    { key: 'HeaderKey', kind: 'apiKeyHeader', headerName: 'X-Key' },
    { key: 'QueryKey', kind: 'apiKeyQuery', paramName: 'api_key' },
    { key: 'CookieKey', kind: 'apiKeyCookie', cookieName: 'sid' },
  ],
} as unknown as ApiModel;

describe('renderDescriptors matches printStatements(descriptorStatements(…))', () => {
  it('full vocabulary, with and without pagination', () => {
    const idents = packageIdents(MODEL);
    const pagination = resolveModelPagination(MODEL, undefined);
    expect(renderDescriptors(MODEL, idents, 'string', pagination)).toBe(
      printStatements(descriptorStatements(MODEL, idents, 'string', pagination))
    );
    expect(renderDescriptors(MODEL, idents, 'string')).toBe(
      printStatements(descriptorStatements(MODEL, idents, 'string'))
    );
  });
});
