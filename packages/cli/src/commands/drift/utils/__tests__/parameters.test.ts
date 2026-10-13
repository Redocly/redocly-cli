import type { NormalizedRequest, OpenApiParameter } from '../../types/index.js';
import {
  buildFormQuerystringSchema,
  FORM_URLENCODED,
  getActualParameterValue,
} from '../parameters.js';

function readQuerystring(mediaType: string, schema: unknown, url: string): unknown {
  const parsedUrl = new URL(url);
  const request: NormalizedRequest = {
    method: 'GET',
    url,
    path: parsedUrl.pathname,
    query: parsedUrl.searchParams,
    protocol: parsedUrl.protocol,
    protocolKnown: true,
    host: parsedUrl.host,
    headers: {},
  };
  const parameter: OpenApiParameter = {
    name: 'filters',
    in: 'querystring',
    required: false,
    schema,
    mediaType,
    formSchema: mediaType === FORM_URLENCODED ? buildFormQuerystringSchema(schema) : undefined,
  };

  return getActualParameterValue(parameter, request, {}, {});
}

describe('getActualParameterValue for querystring parameters', () => {
  it('reads a form query into an object, keeping arrays and parsing object values as JSON', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' } },
        points: { type: 'array', items: { type: 'object' } },
        area: { properties: { size: { type: 'integer' } } },
        owner: { allOf: [{ type: 'object' }] },
        note: { type: ['object', 'null'] },
      },
    };

    const value = readQuerystring(
      FORM_URLENCODED,
      schema,
      'https://api.example.com/places?status=open&status=closed&tags=a&points=%7B%22x%22%3A1%7D' +
        '&area=%7B%22size%22%3A2%7D&owner=not-json&note=null&__proto__=1'
    );

    expect(Object.entries(value as object)).toEqual([
      ['status', ['open', 'closed']],
      ['tags', ['a']],
      ['points', [{ x: 1 }]],
      ['area', { size: 2 }],
      ['owner', 'not-json'],
      ['note', null],
      ['__proto__', '1'],
    ]);
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
    expect(readQuerystring(FORM_URLENCODED, schema, 'https://api.example.com/places')).toBe(
      undefined
    );
  });

  it('parses a JSON query and treats a query that is not valid JSON as missing', () => {
    expect(
      readQuerystring('application/json', {}, 'https://api.example.com/search?%7B%22term%22%3A1%7D')
    ).toEqual({ term: 1 });
    expect(readQuerystring('application/json', {}, 'https://api.example.com/search?not-json')).toBe(
      undefined
    );
  });

  it('decodes a text query and keeps it as sent when its percent-encoding is malformed', () => {
    expect(readQuerystring('text/plain', {}, 'https://api.example.com/echo?caf%C3%A9')).toBe(
      'café'
    );
    expect(readQuerystring('text/plain', {}, 'https://api.example.com/echo?50%')).toBe('50%');
    expect(readQuerystring('text/plain', {}, 'https://api.example.com/echo')).toBe(undefined);
  });
});

describe('buildFormQuerystringSchema', () => {
  it('collects keys from every branch but lets only the root and allOf decide about other keys', () => {
    const oneOfSchema = buildFormQuerystringSchema({
      oneOf: [{ additionalProperties: false, properties: { id: { type: 'string' } } }],
    });
    expect([...oneOfSchema.properties.keys()]).toEqual(['id']);
    expect(oneOfSchema.checksOtherKeys).toBe(false);

    expect(
      buildFormQuerystringSchema({ allOf: [{ unevaluatedProperties: false }] }).checksOtherKeys
    ).toBe(true);
    expect(
      buildFormQuerystringSchema({ patternProperties: { '^x-': { type: 'string' } } })
        .checksOtherKeys
    ).toBe(true);
  });
});
