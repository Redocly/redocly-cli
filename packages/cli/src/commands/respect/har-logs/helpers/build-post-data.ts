import { buildHeaders } from './build-headers.js';

/**
 * The HAR `postData` entry for a request body.
 *
 * Without this the capture records the request line and headers but not what
 * was sent, so anything reading the HAR back — `drift`'s request-body
 * validation, for one — silently has nothing to check.
 */
export function buildPostData(
  body: unknown,
  headers: any = {}
): { mimeType?: string; text?: string } {
  const text = serializeBody(body);
  if (text === undefined || text === '') return {};

  // Via `buildHeaders`, so every shape a request can carry its headers in is
  // handled the same way here as it is for the entry's `headers` list.
  const contentType = buildHeaders(headers).find(
    ({ name }) => String(name).toLowerCase() === 'content-type'
  )?.value;
const fallbackMimeType =
    body instanceof URLSearchParams
      ? 'application/x-www-form-urlencoded;charset=UTF-8'
      : 'application/octet-stream';
  return {
    mimeType: typeof contentType === 'string' ? contentType : 'application/octet-stream',
    text,
  };
}

/** Only bodies that are already text; a stream or binary body is left out. */
function serializeBody(body: unknown): string | undefined {
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();

  return undefined;
}
