export function parseWwwAuthenticateHeader(wwwAuthenticateHeader: string): {
  realm?: string;
  nonce?: string;
  opaque?: string;
  qop?: string;
  algorithm?: string;
  cnonce?: string;
  nc?: string;
} {
  const headerParts = wwwAuthenticateHeader
    .replace('Digest ', '')
    .split(',')
    .map((part: string) => part.trim());

  // Digest The WWW-Authenticate Response Header Field: https://datatracker.ietf.org/doc/html/rfc7616#section-3.3
  const keys = ['realm', 'nonce', 'opaque', 'qop', 'algorithm', 'cnonce', 'nc'];
  const result = Object.fromEntries(
    keys.map((key) => [
      key,
      headerParts
        .find((part) => part.startsWith(`${key}=`))
        ?.split('=')[1]
        ?.replace(/"/g, ''),
    ])
  );

  return result;
}
