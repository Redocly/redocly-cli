import { getOperationById } from './get-operation-by-id.js';
import { getOperationByPath } from './get-operation-by-path.js';

import type { OperationMethod, TestContext } from '../../types.js';
import type { Oas3Operation, Oas3Responses } from '@redocly/openapi-core';

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
  descriptionPaths: Record<string, any>
): Oas3Operation | undefined {
  return descriptionPaths?.[path]?.[method];
}

export function getOperationFromDescriptionBySource(
  source: DescriptionSource,
  ctx: TestContext
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
