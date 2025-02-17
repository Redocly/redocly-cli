import { type Oas3Responses } from '@redocly/openapi-core/lib/typings/openapi';
import { type OperationMethod, type TestContext } from '../../types';
import { getOperationById } from './get-operation-by-id';
import { getOperationByPath } from './get-operation-by-path';

export type DescriptionSource = {
  operationId?: string;
  operationPath?: string;
};

export type OperationDetails = {
  method: OperationMethod;
  path: string;
  descriptionName: string;
  servers?: Array<{ url: string }>;
  responses: Oas3Responses;
};

export function getOperationFromDescription(
  path: string,
  method: string,
  descriptionPaths: Record<string, any>,
): Record<string, string> | undefined {
  return descriptionPaths?.[path]?.[method] as Record<string, string>;
}

export function getOperationFromDescriptionBySource(
  source: DescriptionSource,
  ctx: TestContext,
): (OperationDetails & Record<string, any>) | undefined {
  if (!source.operationId && !source.operationPath) {
    return undefined;
  }

  const { $sourceDescriptions, sourceDescriptions } = ctx;
  const { operationId, operationPath } = source;

  if (operationId) {
    return getOperationById(operationId, $sourceDescriptions);
  } else if (operationPath) {
    return getOperationByPath(operationPath, { $sourceDescriptions, sourceDescriptions });
  } else {
    return undefined;
  }
}
