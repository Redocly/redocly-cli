// challenge = auth-scheme [ 1*SP ( token68 / #auth-param ) ], auth-param = token "=" ( token / quoted-string )
// https://datatracker.ietf.org/doc/html/rfc7235#section-2.1
const SCHEME_OR_AUTH_PARAM = /([\w-]+)(?:\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,]*)))?/g;

export function parseWwwAuthenticateHeader(wwwAuthenticateHeader: string): {
  realm?: string;
  nonce?: string;
  opaque?: string;
  qop?: string;
  algorithm?: string;
} {
  const params: Record<string, string> = {};
  let isDigestChallenge = false;
  for (const [, name, quotedValue, tokenValue] of wwwAuthenticateHeader.matchAll(
    SCHEME_OR_AUTH_PARAM
  )) {
    const value = quotedValue?.replace(/\\(.)/g, '$1') ?? tokenValue;
    if (value === undefined) {
      // A name without a value starts the next challenge, read only the first Digest one
      if (isDigestChallenge) break;
      isDigestChallenge = name.toLowerCase() === 'digest';
    } else if (isDigestChallenge) {
      params[name.toLowerCase()] = value;
    }
  }

  // Digest The WWW-Authenticate Response Header Field: https://datatracker.ietf.org/doc/html/rfc7616#section-3.3
  const { realm, nonce, opaque, qop, algorithm } = params;
  return { realm, nonce, opaque, qop, algorithm };
}
