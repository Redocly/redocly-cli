import type { Oas3Responses } from '@redocly/openapi-core';

import { resolveContentTypeKey } from './resolve-content-by-type.js';

// An explicit status code wins over its range, such as `2XX`, and the range wins over `default`.
export function getResponseKeyByStatusCode(
  descriptionResponses: Oas3Responses,
  statusCode: number
): string | undefined {
  return [String(statusCode), `${Math.floor(statusCode / 100)}XX`, 'default'].find(
    (responseKey) => responseKey in descriptionResponses
  );
}

// Returns the schema of the response and its path from the operation.
export function getResponseSchema({
  statusCode,
  contentType,
  descriptionResponses,
}: {
  statusCode: number;
  contentType: string;
  descriptionResponses?: Record<string, any>;
}) {
  if (!descriptionResponses) return undefined;

  const responseKey = getResponseKeyByStatusCode(descriptionResponses, statusCode);
  if (responseKey === undefined) return undefined;

  const content = descriptionResponses[responseKey]?.content;
  const contentTypeKey = resolveContentTypeKey(content, contentType);
  if (contentTypeKey === undefined || !content[contentTypeKey].schema) return undefined;

  return {
    schema: content[contentTypeKey].schema,
    path: ['responses', responseKey, 'content', contentTypeKey, 'schema'],
  };
}
