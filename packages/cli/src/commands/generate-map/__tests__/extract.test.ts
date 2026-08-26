import type { SecurityView } from '@redocly/openapi-core';

import {
  extractBodyFields,
  extractRequiredParams,
  extractResponseCarry,
  renderRowAuth,
} from '../extract.js';

const noResolve = () => undefined;

describe('renderRowAuth', () => {
  it('renders scheme names with scopes, | for alternatives, + for combined', () => {
    const security: SecurityView = {
      requirements: [{ OAuth2: ['orders:write'] }, { ApiKey: [], Basic: [] }],
      schemes: [],
    };
    expect(renderRowAuth(security)).toBe('OAuth2 (orders:write) | ApiKey + Basic');
  });

  it('inlines what an apiKey scheme asks the caller to send, so the row stands alone', () => {
    // A row that names `SecretApiKey` without its header left 13 benchmark runs sending the key
    // the wrong way: the models never joined the row to the schemes section above it.
    const security: SecurityView = {
      requirements: [{ SecretApiKey: [] }],
      schemes: [{ name: 'SecretApiKey', type: 'apiKey', in: 'header', keyName: 'REB-APIKEY' }],
    };
    expect(renderRowAuth(security)).toBe('SecretApiKey (header REB-APIKEY)');
  });

  it('keeps scopes for an oauth2 scheme and leaves a bearer scheme bare', () => {
    const security: SecurityView = {
      requirements: [{ OAuth2: ['orders:write'] }, { bearer_auth: [] }],
      schemes: [
        { name: 'OAuth2', type: 'oauth2' },
        { name: 'bearer_auth', type: 'http', scheme: 'bearer' },
      ],
    };
    expect(renderRowAuth(security)).toBe('OAuth2 (orders:write) | bearer_auth');
  });

  it('says none for an explicit empty requirement list, and omits when undeclared', () => {
    expect(renderRowAuth({ requirements: [], schemes: [] })).toBe('none');
    expect(renderRowAuth(undefined)).toBeUndefined();
  });
});

describe('extractBodyFields', () => {
  it('lists required fields first with *, compact types, enums on required fields', () => {
    const operation = {
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['intent', 'purchase_units'],
              properties: {
                intent: { type: 'string', enum: ['CAPTURE', 'AUTHORIZE'] },
                purchase_units: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['amount'],
                    properties: { amount: { type: 'object' }, reference_id: { type: 'string' } },
                  },
                },
                payer: { type: 'object' },
              },
            },
          },
        },
      },
    };
    expect(extractBodyFields(operation, noResolve)).toBe(
      'intent*:CAPTURE|AUTHORIZE, purchase_units*:[{amount*}], payer:obj'
    );
  });

  it('resolves a $ref body schema and names the content type when it is not JSON', () => {
    const schema = {
      type: 'object',
      required: ['name'],
      properties: { name: { type: 'string' }, size_gib: { type: 'integer' } },
    };
    const operation = {
      requestBody: {
        content: { 'application/json': { schema: { $ref: 'models/nfs_request.yml' } } },
      },
    };
    const resolve = (ref: string) => (ref === 'models/nfs_request.yml' ? schema : undefined);
    expect(extractBodyFields(operation, resolve)).toBe('name*, size_gib:int');

    const binary = { requestBody: { content: { 'application/octet-stream': { schema: {} } } } };
    expect(extractBodyFields(binary, noResolve)).toBe('application/octet-stream');
  });

  it('caps the list at 10 fields and returns undefined without a request body', () => {
    const properties = Object.fromEntries(
      Array.from({ length: 13 }, (_, index) => [`field${index}`, { type: 'string' }])
    );
    const operation = {
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties } } } },
    };
    const rendered = extractBodyFields(operation, noResolve)!;
    expect(rendered.endsWith('+3 more')).toBe(true);
    expect(extractBodyFields({}, noResolve)).toBeUndefined();
  });
});

describe('extractRequiredParams', () => {
  it('lists required non-path parameters only', () => {
    const operation = {
      parameters: [
        { name: 'per_page', in: 'query' },
        { name: 'X-Region', in: 'header', required: true },
        { name: 'nfs_id', in: 'path', required: true },
      ],
    };
    expect(extractRequiredParams(operation, () => undefined)).toBe('X-Region');
    expect(extractRequiredParams({}, () => undefined)).toBeUndefined();
  });
});

describe('extractResponseCarry', () => {
  it('carries required top-level fields and id-like fields at any depth as dotted paths', () => {
    const operation = {
      responses: {
        '201': {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string' },
                  purchase_units: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        payments: {
                          type: 'object',
                          properties: {
                            captures: {
                              type: 'array',
                              items: { type: 'object', properties: { id: { type: 'string' } } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': { description: 'nope' },
      },
    };
    expect(extractResponseCarry(operation, () => undefined)).toBe(
      '201→{status, purchase_units[].payments.captures[].id}'
    );
  });

  it('appends the host when the operation overrides servers, and renders bodyless codes bare', () => {
    const withServer = {
      servers: [{ url: 'https://uploads.github.com' }],
      responses: {
        '201': {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { id: {}, upload_url: {} } },
            },
          },
        },
      },
    };
    expect(extractResponseCarry(withServer, () => undefined)).toBe(
      '201→{id, upload_url ⇒ uploads.github.com}'
    );
    expect(
      extractResponseCarry({ responses: { '204': { description: 'gone' } } }, () => undefined)
    ).toBe('204');
    expect(extractResponseCarry({ responses: { '400': {} } }, () => undefined)).toBeUndefined();
  });

  it('recognizes camelCase id-like fields too', () => {
    const operation = {
      responses: {
        '201': {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { ticketId: { type: 'string' }, note: {} } },
            },
          },
        },
      },
    };
    expect(extractResponseCarry(operation, () => undefined)).toBe('201→{ticketId}');
  });

  it('resolves a wrapper response $ref before reading the schema', () => {
    const wrapper = {
      content: { 'application/json': { schema: { type: 'object', properties: { share_id: {} } } } },
    };
    const operation = { responses: { '200': { $ref: 'responses/nfs_create.yml' } } };
    const resolve = (ref: string) =>
      ref === 'responses/nfs_create.yml' ? (wrapper as Record<string, unknown>) : undefined;
    expect(extractResponseCarry(operation, resolve)).toBe('200→{share_id}');
  });
});
