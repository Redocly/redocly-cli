// Shared operation-shape predicates.

import type { RequestBodyModel } from '@redocly/client-generator';

/**
 * A multipart body whose schema is a concrete object — the case worth typing. Such a body
 * is emitted as its object shape (binary fields → `Blob`); the runtime serializes it to
 * `FormData` (`runtime/multipart.ts`) after the onRequest chain. Multipart bodies with a
 * non-object schema can't be typed field-by-field, so they keep the raw `FormData` escape hatch.
 */
export function isTypedMultipart(rb: RequestBodyModel): boolean {
  return rb.contentType === 'multipart/form-data' && rb.schema.kind === 'object';
}
