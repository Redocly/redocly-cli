import type { ClientConfig, SecuritySpec, TokenProvider } from './types.js';

/** Resolve a credential: a literal passes through; a function is awaited per request. */
async function resolveToken(provider: TokenProvider): Promise<string> {
  return typeof provider === 'function' ? await provider() : provider;
}

/** UTF-8-safe base64: bare `btoa` throws on non-Latin-1 credentials (RFC 7617 allows UTF-8). */
function encodeBase64(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Build the auth headers/query for one operation's `security` requirements from the
 * instance credentials (`config.auth`) — capability module, wired into `createClient`.
 * A scheme with no configured credential contributes nothing (the request is sent
 * unauthenticated and the server rejects it, mirroring the generated-client behavior).
 * Cookie-borne apiKeys fold into a single `Cookie` header joined with `; `.
 */
export async function resolveAuth(
  security: readonly SecuritySpec[],
  config: ClientConfig
): Promise<{ headers: Record<string, string>; query: Record<string, string> }> {
  const headers: Record<string, string> = {};
  const query: Record<string, string> = {};
  const cookies: string[] = [];
  for (const scheme of security) {
    if (scheme.kind === 'apiKey') {
      const provider = config.auth?.apiKey?.[scheme.scheme];
      if (provider === undefined) continue;
      const value = await resolveToken(provider);
      if (scheme.in === 'header') headers[scheme.name] = value;
      else if (scheme.in === 'query') query[scheme.name] = value;
      // Cookie values may contain reserved characters (`;`, `=`, space, …); percent-encode
      // so the credential can't break the `Cookie` header syntax.
      else cookies.push(`${scheme.name}=${encodeURIComponent(value)}`);
    } else if (scheme.kind === 'bearer') {
      const provider = config.auth?.bearer;
      if (provider !== undefined) headers.Authorization = `Bearer ${await resolveToken(provider)}`;
    } else {
      const basic = config.auth?.basic;
      if (basic !== undefined) {
        headers.Authorization = `Basic ${encodeBase64(`${basic.username}:${basic.password}`)}`;
      }
    }
  }
  if (cookies.length > 0) headers.Cookie = cookies.join('; ');
  return { headers, query };
}
