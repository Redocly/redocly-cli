import { buildResponseCookies } from '../../../../../commands/respect/har-logs/helpers/build-response-cookies.js';

describe('buildResponseCookies', () => {
  it('should build response cookies', () => {
    const headers = {
      'set-cookie': [
        'name=value; Path=/; Expires=Fri, 25 Dec 2024 12:00:00 GMT; HttpOnly; Secure',
        'name2=value2; Path=/; Expires=Fri, 25 Dec 2024 12:00:00 GMT; HttpOnly; Secure',
      ],
    };
    const cookies = buildResponseCookies(headers);
    expect(cookies).toEqual([
      {
        name: 'name',
        value: 'value',
        path: '/',
        expires: '2024-12-25T12:00:00.000Z',
        httpOnly: true,
        secure: true,
      },
      {
        name: 'name2',
        value: 'value2',
        path: '/',
        expires: '2024-12-25T12:00:00.000Z',
        httpOnly: true,
        secure: true,
      },
    ]);
  });

  it('should handle empty headers', () => {
    const headers = {};
    const cookies = buildResponseCookies(headers);
    expect(cookies).toEqual([]);
  });

  it('should handle headers with no set-cookie', () => {
    const headers = { 'content-type': 'application/json' };
    const cookies = buildResponseCookies(headers);
    expect(cookies).toEqual([]);
  });

  it('should handle headers with invalid set-cookie', () => {
    const headers = { 'set-cookie': ['invalid-cookie'] };
    const cookies = buildResponseCookies(headers);
    expect(cookies).toEqual([
      { httpOnly: false, name: '', secure: false, value: 'invalid-cookie' },
    ]);
  });

  it('should set domain if present', () => {
    const headers = {
      'set-cookie': [
        'name=value; Domain=example.com; Path=/; Expires=Fri, 25 Dec 2024 12:00:00 GMT; HttpOnly; Secure',
      ],
    };
    const cookies = buildResponseCookies(headers);
    expect(cookies[0].domain).toEqual('example.com');
  });

  it('should handle Headers instance with valid cookie format', () => {
    const headers = new Headers();
    headers.append(
      'set-cookie',
      'name=value; Path=/; Expires=Fri, 25 Dec 2024 12:00:00 GMT; HttpOnly; Secure'
    );
    const cookies = buildResponseCookies(headers);
    expect(cookies).toEqual([
      {
        name: 'name',
        value: 'value',
        path: '/',
        expires: '2024-12-25T12:00:00.000Z',
        httpOnly: true,
        secure: true,
      },
    ]);
  });
});
