import type { OperationDetails } from './get-operation-from-description';

export function getRequestBodySchema(
  contentType: string,
  descriptionOperation: (OperationDetails & Record<string, any>) | undefined,
) {
  if (!descriptionOperation) return undefined;

  const requestBody = descriptionOperation.requestBody;
  const requestBodyContent = requestBody?.content;
  const schema = requestBodyContent && requestBodyContent[contentType]?.schema;

  return schema || undefined;
}
