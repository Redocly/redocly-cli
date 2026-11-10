import { parseWwwAuthenticateHeader } from '../../digest-auth/parse-www-authenticate-header.js';

describe('parseWwwAuthenticateHeader', () => {
  it('should parse the www-authenticate header', () => {
    const wwwAuthenticateHeader =
      'Digest realm="me@smth.com", nonce="2115c839b5039f8221bf3e970f9ef06b", qop="auth", opaque="df88e8ed5ea8c53b1760e8e69dc1fce1", algorithm=MD5, stale=FALSE';
    const result = parseWwwAuthenticateHeader(wwwAuthenticateHeader);
    expect(result).toEqual({
      realm: 'me@smth.com',
      nonce: '2115c839b5039f8221bf3e970f9ef06b',
      opaque: 'df88e8ed5ea8c53b1760e8e69dc1fce1',
      qop: 'auth',
      algorithm: 'MD5',
    });
  });

  it('should parse the www-authenticate header when some fields are missing', () => {
    const wwwAuthenticateHeader =
      'Digest realm="me@smth.com", nonce="2115c839b5039f8221bf3e970f9ef06b"';
    const result = parseWwwAuthenticateHeader(wwwAuthenticateHeader);
    expect(result).toEqual({
      realm: 'me@smth.com',
      nonce: '2115c839b5039f8221bf3e970f9ef06b',
    });
  });

  it('should keep `=` and `,` inside quoted values', () => {
    const wwwAuthenticateHeader =
      'Digest realm="me@smth.com", qop="auth, auth-int", nonce="MTIzNDU2Nzg5MA==", algorithm=MD5';
    const result = parseWwwAuthenticateHeader(wwwAuthenticateHeader);
    expect(result).toEqual({
      realm: 'me@smth.com',
      qop: 'auth, auth-int',
      nonce: 'MTIzNDU2Nzg5MA==',
      algorithm: 'MD5',
    });
  });

  it('should read only the first Digest challenge', () => {
    const wwwAuthenticateHeader =
      'Basic realm="basic", Digest realm="digest", nonce="first", qop="auth", algorithm=SHA-256, Digest realm="digest", nonce="second", qop="auth", algorithm=MD5, Basic realm="other"';
    const result = parseWwwAuthenticateHeader(wwwAuthenticateHeader);
    expect(result).toEqual({
      realm: 'digest',
      nonce: 'first',
      qop: 'auth',
      algorithm: 'SHA-256',
    });
  });
});
