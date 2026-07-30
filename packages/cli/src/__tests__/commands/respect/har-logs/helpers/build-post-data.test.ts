import { buildPostData } from '../../../../../commands/respect/har-logs/helpers/build-post-data.js';

describe('buildPostData', () => {
  it('records a JSON body with the content type the request declared', () => {
    const headers = { 'content-type': 'application/json' };

    expect(buildPostData('{"bio":"x"}', headers)).toEqual({
      mimeType: 'application/json',
      text: '{"bio":"x"}',
    });
  });

  it('matches the content-type header regardless of its casing', () => {
    expect(buildPostData('{}', { 'Content-Type': 'application/json' }).mimeType).toBe(
      'application/json'
    );
  });

  it('reads the content type from the flat array header form', () => {
    const headers = ['accept', '*/*', 'content-type', 'application/json'];

    expect(buildPostData('{}', headers).mimeType).toBe('application/json');
  });

  it('reads the content type from a Headers-like object', () => {
    const headers = new Map([['content-type', 'application/json']]);

    expect(buildPostData('{}', headers).mimeType).toBe('application/json');
  });

  it('falls back to application/octet-stream when no content type was declared', () => {
    expect(buildPostData('raw', {}).mimeType).toBe('application/octet-stream');
  });

  it('returns an empty object for a request with no body, as before', () => {
    expect(buildPostData(undefined, {})).toEqual({});
  });

  it('treats an empty string body as no body', () => {
    expect(buildPostData('', {})).toEqual({});
  });

  it('serializes a URLSearchParams body', () => {
    const body = new URLSearchParams({ a: '1', b: '2' });

    expect(buildPostData(body, {}).text).toBe('a=1&b=2');
  });

  it('does not attempt to serialize a stream body', () => {
    expect(buildPostData(Buffer.from('binary'), {})).toEqual({});
  });

  it('omits a non-string body rather than recording "[object Object]"', () => {
    expect(buildPostData({ bio: 'x' }, { 'content-type': 'application/json' })).toEqual({});
  });

  it('omits a FormData body, which cannot be read without consuming it', () => {
    expect(buildPostData(new FormData(), { 'content-type': 'multipart/form-data' })).toEqual({});
  });
});
