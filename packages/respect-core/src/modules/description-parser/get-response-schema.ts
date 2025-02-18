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

  return response?.content?.[contentType]?.schema;
}
