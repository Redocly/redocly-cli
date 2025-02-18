import { mapHeaderParamsAndCookieToObject } from '../../config-parser/map-header-params-and-cookie-to-object';

describe('mapHeaderParamsAndCookieToObject', () => {
  it('should map header parameters correctly', () => {
    const headerParams = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    };
    const result = mapHeaderParamsAndCookieToObject(headerParams);
    expect(result).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    });
  });

  it('should map cookies correctly', () => {
    const headerParams = {
      Cookie: 'sessionId=abc123; userId=xyz789',
    };
    const result = mapHeaderParamsAndCookieToObject(headerParams);
    expect(result).toEqual({
      sessionId: 'abc123',
      userId: 'xyz789',
    });
  });

  it('should handle mixed headers and cookies', () => {
    const headerParams = {
      'Content-Type': 'application/json',
      Cookie: 'sessionId=abc123; userId=xyz789',
      Authorization: 'Bearer token',
    };
    const result = mapHeaderParamsAndCookieToObject(headerParams);
    expect(result).toEqual({
      'Content-Type': 'application/json',
      sessionId: 'abc123',
      userId: 'xyz789',
      Authorization: 'Bearer token',
    });
  });

  it('should handle empty cookie header', () => {
    const headerParams = {
      Cookie: '',
    };
    const result = mapHeaderParamsAndCookieToObject(headerParams);
    expect(result).toEqual({});
  });

  it('should handle malformed cookie header', () => {
    const headerParams = {
      Cookie: 'sessionId=abc123; malformedCookie',
    };
    const result = mapHeaderParamsAndCookieToObject(headerParams);
    expect(result).toEqual({
      sessionId: 'abc123',
    });
  });

  it('should handle multiple cookies with spaces', () => {
    const headerParams = {
      Cookie: 'sessionId=abc123; userId=xyz789; token=abc def',
    };
    const result = mapHeaderParamsAndCookieToObject(headerParams);
    expect(result).toEqual({
      sessionId: 'abc123',
      userId: 'xyz789',
      token: 'abc def',
    });
  });
});
