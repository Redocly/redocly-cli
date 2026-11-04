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
      cnonce: 'test',
      uri: 'test',
      method: 'test',
    });
    expect(header).toBe(
      'Digest username="test", realm="test", nonce="test", uri="test", qop=test, nc=00000001, cnonce="test", response="5f19ec82bf818203db7c86fda2f3f739", algorithm=MD5, opaque="test"'
    );
  });

  it('should throw an error if required parameters are missing', () => {
    expect(() =>
      generateDigestAuthHeader({
        username: 'test',
        password: 'test',
        realm: 'test',
        qop: 'test',
        uri: 'test',
        method: 'test',
      })
    ).toThrow('Missing required digest auth parameters: nonce');
  });

  it('should generate the header without opaque when the server does not send it', () => {
    const header = generateDigestAuthHeader({
      username: 'test',
      password: 'test',
      realm: 'test',
      nonce: 'test',
      qop: 'test',
      cnonce: 'test',
      uri: 'test',
      method: 'test',
    });
    expect(header).toBe(
      'Digest username="test", realm="test", nonce="test", uri="test", qop=test, nc=00000001, cnonce="test", response="5f19ec82bf818203db7c86fda2f3f739", algorithm=MD5'
    );
  });

  it('should generate a client nonce when none is given', () => {
    const header = generateDigestAuthHeader({
      username: 'test',
      password: 'test',
      realm: 'test',
      nonce: 'test',
      qop: 'auth',
      opaque: 'test',
      uri: 'test',
      method: 'test',
    });
    expect(header).toMatch(/cnonce="[0-9a-f]{32}"/);
  });

  // The example from https://datatracker.ietf.org/doc/html/rfc7616#section-3.9.1
  it('should pick `auth` when the server offers several qop values', () => {
    const header = generateDigestAuthHeader({
      username: 'Mufasa',
      password: 'Circle of Life',
      realm: 'http-auth@example.org',
      nonce: '7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v',
      opaque: 'FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS',
      qop: 'auth, auth-int',
      cnonce: 'f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ',
      uri: '/dir/index.html',
      method: 'GET',
    });
    expect(header).toBe(
      'Digest username="Mufasa", realm="http-auth@example.org", nonce="7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v", uri="/dir/index.html", qop=auth, nc=00000001, cnonce="f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ", response="8ca523f5e9506fed4657c9700eebdbec", algorithm=MD5, opaque="FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS"'
    );
  });

  it('should use SHA-256 when algorithm is SHA-256', () => {
    const header = generateDigestAuthHeader({
      username: 'test',
      password: 'test',
      realm: 'test',
      nonce: 'test',
      qop: 'test',
      opaque: 'test',
      cnonce: 'test',
      uri: 'test',
      method: 'test',
      algorithm: 'SHA-256',
    });
    expect(header).toBe(
      'Digest username="test", realm="test", nonce="test", uri="test", qop=test, nc=00000001, cnonce="test", response="c301530ad2fc5a090bae52255b1a5aef3cedd990b260ffc162d9f52e6dded801", algorithm=SHA-256, opaque="test"'
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
      cnonce: 'test',
      uri: 'test',
      method: 'test',
    });
    expect(header).toBe(
      'Digest username="test", realm="test", nonce="test", uri="test", qop=test, nc=00000001, cnonce="test", response="5f19ec82bf818203db7c86fda2f3f739", algorithm=MD5, opaque="test"'
    );
  });
});
