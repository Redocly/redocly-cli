import type { ParseAs } from './types.js';

/**
 * Read the response body per `kind`. `'auto'` negotiates from the content type
 * (JSON, then `text/*`, then Blob); `'void'` and `204` responses read nothing.
 */
export async function parse(response: Response, kind: ParseAs | 'void'): Promise<unknown> {
  if (kind === 'void' || response.status === 204) return undefined;
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
  return response.blob();
}

/** Best-effort decode of a non-2xx body (JSON when declared, else text; undefined on failure). */
export async function readError(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.toLowerCase().includes('json')) {
    return response.json().catch(() => undefined);
  }
  return response.text().catch(() => undefined);
}
