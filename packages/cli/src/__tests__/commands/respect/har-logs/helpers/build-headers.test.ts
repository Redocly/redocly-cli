import { buildHeaders } from '../../../../../commands/respect/har-logs/helpers/build-headers.js';

describe('buildHeaders', () => {
  it('should build headers from an array', () => {
    const headers = buildHeaders(['Accept', '*/*', 'User-Agent', 'undici']);
    expect(headers).toEqual([
      { name: 'Accept', value: '*/*' },
      { name: 'User-Agent', value: 'undici' },
    ]);
  });

  it('should build headers from an object', () => {
    const headers = buildHeaders({ Accept: '*/*', 'User-Agent': 'undici' });
    expect(headers).toEqual([
      { name: 'Accept', value: '*/*' },
      { name: 'User-Agent', value: 'undici' },
    ]);
  });

  it('should build headers from a Map', () => {
    const headers = buildHeaders(
      new Map([
        ['Accept', '*/*'],
        ['User-Agent', 'undici'],
      ])
    );
    expect(headers).toEqual([
      { name: 'Accept', value: '*/*' },
      { name: 'User-Agent', value: 'undici' },
    ]);
  });
});
