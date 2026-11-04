// auth-param = token "=" ( token / quoted-string ): https://datatracker.ietf.org/doc/html/rfc7235#section-2.1
const AUTH_PARAM = /([\w-]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([^\s,]+))/g;

export function parseWwwAuthenticateHeader(wwwAuthenticateHeader: string): {
  realm?: string;
  nonce?: string;
  opaque?: string;
  qop?: string;
  algorithm?: string;
} {
  const params: Record<string, string> = {};
  for (const [, key, quotedValue, tokenValue] of wwwAuthenticateHeader.matchAll(AUTH_PARAM)) {
    params[key.toLowerCase()] = quotedValue?.replace(/\\(.)/g, '$1') ?? tokenValue;
  }

  // Digest The WWW-Authenticate Response Header Field: https://datatracker.ietf.org/doc/html/rfc7616#section-3.3
  const { realm, nonce, opaque, qop, algorithm } = params;
  return { realm, nonce, opaque, qop, algorithm };
}
