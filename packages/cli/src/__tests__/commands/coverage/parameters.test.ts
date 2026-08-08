import {
  collectParameters,
  createParameterUse,
  recordParameters,
  summarizeParameters,
} from '../../../commands/coverage/engine/parameters.js';
import type { Schema } from '../../../commands/coverage/engine/schema.js';

const SPEC: Schema = {
  paths: {
    '/stores/{storeId}': {
      parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        operationId: 'getStore',
        parameters: [
          { name: 'sellerId', in: 'query', required: true, schema: { type: 'string' } },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['live', 'draft', 'archived'] },
          },
          { name: 'x-region', in: 'header', schema: { type: 'string' } },
        ],
      },
    },
  },
};

function use(query: Record<string, string>, pathParams: Record<string, string> = {}) {
  const parameterUse = createParameterUse();

  recordParameters(parameterUse, 'get /stores/{storeId}', {
    query: new URLSearchParams(query),
    pathParams,
    headers: {},
  });

  return parameterUse;
}

describe('collectParameters', () => {
  it('merges the path item parameters with the operation ones', () => {
    const declared = collectParameters(SPEC).get('get /stores/{storeId}');

    expect(declared?.map(({ name }) => name).sort()).toEqual([
      'sellerId',
      'status',
      'storeId',
      'x-region',
    ]);
  });

  it('carries the values an enum pins a parameter to', () => {
    const declared = collectParameters(SPEC).get('get /stores/{storeId}');

    expect(declared?.find(({ name }) => name === 'status')?.values).toEqual([
      'live',
      'draft',
      'archived',
    ]);
  });
});

describe('summarizeParameters', () => {
  const declared = collectParameters(SPEC);

  it('reports a documented parameter nothing ever sent', () => {
    const result = summarizeParameters(declared, use({ status: 'live' }, { storeId: 'st_1' }));

    expect(result.unused).toEqual([
      'GET /stores/{storeId}  header.x-region',
      'GET /stores/{storeId}  query.sellerId',
    ]);
  });

  it('counts the parameters the traffic did send', () => {
    const result = summarizeParameters(declared, use({ status: 'live' }, { storeId: 'st_1' }));

    expect(result).toMatchObject({ seen: 2, total: 4 });
  });

  it('reports the enum values nothing ever used', () => {
    const result = summarizeParameters(declared, use({ status: 'live' }, { storeId: 'st_1' }));

    expect(result.unusedValues).toEqual([
      'GET /stores/{storeId}  query.status=archived',
      'GET /stores/{storeId}  query.status=draft',
    ]);
  });

  it('reports nothing unused once every parameter and value appeared', () => {
    const parameterUse = createParameterUse();
    for (const status of ['live', 'draft', 'archived']) {
      recordParameters(parameterUse, 'get /stores/{storeId}', {
        query: new URLSearchParams({ status, sellerId: 'sel_1' }),
        pathParams: { storeId: 'st_1' },
        headers: { 'x-region': 'us' },
      });
    }

    const result = summarizeParameters(declared, parameterUse);

    expect(result).toMatchObject({ seen: 4, total: 4, unused: [], unusedValues: [] });
  });

  it('reads a cookie parameter out of the cookie header', () => {
    const spec: Schema = {
      paths: {
        '/x': { get: { parameters: [{ name: 'session', in: 'cookie' }] } },
      },
    };
    const parameterUse = createParameterUse();

    recordParameters(parameterUse, 'get /x', {
      query: new URLSearchParams(),
      pathParams: {},
      headers: { cookie: 'session=abc; other=1' },
    });

    expect(summarizeParameters(collectParameters(spec), parameterUse).unused).toEqual([]);
  });
});
