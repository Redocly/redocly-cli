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
});
