import { generateDigestAuthHeader } from '../../digest-auth/generate-digest-auth-header.js';

describe('generateDigestAuthHeader', () => {
  it('should generate a digest auth header', () => {
    const header = generateDigestAuthHeader({
      username: 'test',
      password: 'test',
      realm: 'test',
      nonce: 'test',
      qop: 'test',
      opaque: 'test',
      uri: 'test',
      method: 'test',
    });
    expect(header).toBe(
      'Digest username="test", realm="test", nonce="test", uri="test", qop=test, nc=00000001, cnonce="undefined", response="0ba4491f16f36950e4f932dba0ba1a25", algorithm=MD5, opaque="test"'
    );
  });

  it('should throw an error if required parameters are missing', () => {
    expect(() =>
      generateDigestAuthHeader({
        username: 'test',
        password: 'test',
        realm: 'test',
        nonce: 'test',
        qop: 'test',
        uri: 'test',
        method: 'test',
      })
    ).toThrow('Missing required digest auth parameters');
  });

  it('should use sha256 algorithm if algorithm is sha256', () => {
    const header = generateDigestAuthHeader({
      username: 'test',
      password: 'test',
      realm: 'test',
      nonce: 'test',
      qop: 'test',
      opaque: 'test',
      uri: 'test',
      method: 'test',
      algorithm: 'sha256',
    });
    expect(header).toBe(
      'Digest username="test", realm="test", nonce="test", uri="test", qop=test, nc=00000001, cnonce="undefined", response="0ba4491f16f36950e4f932dba0ba1a25", algorithm=sha256, opaque="test"'
    );
  });

  it('should use md5 algorithm if algorithm is not specified', () => {
    const header = generateDigestAuthHeader({
      username: 'test',
      password: 'test',
      realm: 'test',
      nonce: 'test',
      qop: 'test',
      opaque: 'test',
      uri: 'test',
      method: 'test',
    });
    expect(header).toBe(
      'Digest username="test", realm="test", nonce="test", uri="test", qop=test, nc=00000001, cnonce="undefined", response="0ba4491f16f36950e4f932dba0ba1a25", algorithm=MD5, opaque="test"'
    );
  });
});
