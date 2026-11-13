import type { OperationDetails } from './get-operation-from-description.js';
import { resolveContentByType } from './resolve-content-by-type.js';

export function getRequestBodySchema(
  contentType: string,
  descriptionOperation: (OperationDetails & Record<string, any>) | undefined
) {
  if (!descriptionOperation) return undefined;

  return resolveContentByType(descriptionOperation.requestBody?.content, contentType)?.schema;
}
