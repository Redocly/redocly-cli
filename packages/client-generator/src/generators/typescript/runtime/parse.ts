import type { ParseAs } from './types.js';

/**
 * Read the response body per `kind`. `'auto'` negotiates from the content type
 * (JSON, then `text/*`, then Blob); `204` responses read nothing. A `'void'`
 * operation (no declared 2xx content) still returns a JSON body the server
 * actually sends: the static type stays `void`, but silently dropping real data
 * behind a spec gap is the worse failure — consumers can reach it with a cast
 * while the API description catches up.
 */
export async function parse(response: Response, kind: ParseAs | 'void'): Promise<unknown> {
  if (kind === 'void') {
    if (response.status === 204 || response.status === 205 || response.status === 304) {
      return undefined;
    }
    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.includes('json')) return undefined;
    // Best-effort: an empty or malformed body on an undeclared response stays undefined.
    const text = await response.text().catch(() => '');
    if (text === '') return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  if (response.status === 204) return undefined;
  if (kind === 'stream') return response.body;
  if (kind === 'blob') return response.blob();
  if (kind === 'arrayBuffer') return response.arrayBuffer();
  if (kind === 'formData') return response.formData();
  if (kind === 'text') return response.text();
  if (kind === 'json') return response.json();
  // 'auto' — negotiate from the response's content type (case-insensitively:
  // `Text/Plain` and `application/JSON` are valid per RFC 9110).
  const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
  if (contentType.includes('json')) return response.json();
  if (contentType.startsWith('text/')) return response.text();
  // An untyped body reads as a Blob — but an EMPTY one resolves to undefined: a 2xx
  // with `Content-Length: 0` must not yield a truthy `new Blob([])` that silently
  // defeats every `!data` guard downstream.
  const blob = await response.blob();
  return blob.size > 0 ? blob : undefined;
}

/** Best-effort decode of a non-2xx body (JSON when declared, else text; undefined on failure). */
export async function readError(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('json')) {
    return response.json().catch(() => undefined);
  }
  return response.text().catch(() => undefined);
}
