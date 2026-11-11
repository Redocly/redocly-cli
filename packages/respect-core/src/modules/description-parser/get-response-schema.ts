import { resolveContentByType } from './resolve-content-by-type.js';

// An explicit status code wins over its range, such as `2XX`, and the range wins over `default`.
export function getResponseKeyByStatusCode(
  descriptionResponses: Record<string, any>,
  statusCode: number
): string | undefined {
  return [String(statusCode), `${Math.floor(statusCode / 100)}XX`, 'default'].find(
    (responseKey) => responseKey in descriptionResponses
  );
}

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
  const response = responseKey ? descriptionResponses[responseKey] : undefined;

  return resolveContentByType(response?.content, contentType)?.schema;
}
