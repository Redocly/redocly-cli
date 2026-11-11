import { resolveContentByType } from './resolve-content-by-type.js';

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

  const response = descriptionResponses[statusCode] || descriptionResponses.default;

  return resolveContentByType(response?.content, contentType)?.schema;
}
