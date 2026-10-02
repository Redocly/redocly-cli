import type { NormalizedRequest, OpenApiParameter } from '../../types/index.js';
import { getActualParameterValue } from '../parameters.js';

describe('getActualParameterValue for querystring parameters', () => {
  it('keeps every traffic key as an own property of the parsed form object', () => {
    const url = 'https://api.example.com/events?__proto__=a&__proto__=b&status=ok';
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
      required: true,
      content: { 'application/x-www-form-urlencoded': { type: 'object' } },
    };

    const value = getActualParameterValue(parameter, request, {}, {}) as Record<string, unknown>;

    expect(Object.keys(value)).toEqual(['__proto__', 'status']);
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype);
  });
});
