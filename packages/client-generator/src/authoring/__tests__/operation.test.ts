import type { ServerModel } from '../../intermediate-representation/model.js';
import { isBinaryContentType, serverUrlParts } from '../operation.js';

describe('isBinaryContentType', () => {
  it.each([
    'application/octet-stream',
    'application/gzip',
    'application/x-gzip',
    'application/zip',
    'application/x-tar',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'audio/mpeg',
    'video/mp4',
    'font/woff2',
  ])('treats %s as binary', (contentType) => {
    expect(isBinaryContentType(contentType)).toBe(true);
  });

  it.each(['application/json', 'application/problem+json', 'text/plain', 'text/event-stream'])(
    'treats %s as not binary',
    (contentType) => {
      expect(isBinaryContentType(contentType)).toBe(false);
    }
  );

  it('ignores parameters and case', () => {
    expect(isBinaryContentType('Application/GZIP; q=0.9')).toBe(true);
  });
});

describe('serverUrlParts', () => {
  it('splits a template into literals and declared variables, in order', () => {
    const server = {
      url: 'https://{region}.api.example.com/{basePath}',
      variables: [
        { name: 'region', default: 'us' },
        { name: 'basePath', default: 'v1' },
      ],
    } as ServerModel;
    expect(serverUrlParts(server)).toEqual([
      { kind: 'literal', value: 'https://' },
      { kind: 'variable', name: 'region' },
      { kind: 'literal', value: '.api.example.com/' },
      { kind: 'variable', name: 'basePath' },
    ]);
  });

  it('keeps an undeclared placeholder as literal text, and never returns zero parts', () => {
    const undeclared = {
      url: 'https://{region}.example.com',
      variables: [],
    } as unknown as ServerModel;
    expect(serverUrlParts(undeclared)).toEqual([
      { kind: 'literal', value: 'https://{region}.example.com' },
    ]);
    const empty = { url: '', variables: [] } as unknown as ServerModel;
    expect(serverUrlParts(empty)).toEqual([{ kind: 'literal', value: '' }]);
  });
});
