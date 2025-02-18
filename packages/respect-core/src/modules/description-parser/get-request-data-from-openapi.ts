import { isPlainObject } from '@redocly/openapi-core/lib/utils';
import { generateTestDataFromJsonSchema, generateExampleValue } from '../test-config-generator';
import { extractFirstExample } from './extract-first-example';
import { isParameterWithIn } from '../config-parser';

import type { Parameter } from '../../types';
import type { ParameterWithIn } from '../config-parser';
import type { OperationDetails } from './get-operation-from-description';

export interface OpenApiRequestData {
  requestBody?: Record<string, unknown>;
  contentType?: string;
  parameters: ParameterWithIn[];
}

export function getRequestDataFromOpenApi(
  operation: OperationDetails & Record<string, any>
): OpenApiRequestData {
  const content: Record<string, any> = operation?.requestBody?.content || {};
  const [contentType, contentItem]: [string, any] = Object.entries(content)[0] || [];

  const requestBody =
    contentItem?.example ||
    extractFirstExample(contentItem?.examples) ||
    generateTestDataFromJsonSchema(contentItem?.schema);

  const accept = getAcceptHeader(operation);
  const parameters = getUniqueParameters([
    ...transformParameters(operation.pathParameters),
    { name: 'content-type', in: 'header' as const, value: contentType },
    ...(accept ? [{ name: 'accept', in: 'header' as const, value: accept }] : []),
    ...transformParameters(operation.parameters),
  ]).filter(({ value }) => value);

  return {
    parameters,
    requestBody,
    contentType,
  };
}

function getAcceptHeader(descriptionOperation: OperationDetails & Record<string, any>) {
  return descriptionOperation?.responses
    ? Array.from(
        new Set(
          Object.values(descriptionOperation.responses).flatMap((response) => {
            if (isPlainObject(response) && 'content' in response) {
              return Object.keys((response as Record<string, any>).content || {});
            }
            return [];
          })
        )
      ).join(', ')
    : undefined;
}

function transformParameters(params: Parameter[]): ParameterWithIn[] {
  return (params || [])
    .filter(
      (parameter): parameter is ParameterWithIn & { required: true } => parameter?.required === true
    )
    .map((parameter) => {
      if (isParameterWithIn(parameter)) {
        return {
          name: parameter.name,
          in: parameter.in,
          value: generateExampleValue(parameter),
        } as ParameterWithIn;
      }
      // Return undefined for non-matching parameters
      return undefined;
    })
    .filter((parameter): parameter is ParameterWithIn => parameter !== undefined);
}

function getUniqueParameters(parameters: ParameterWithIn[]): ParameterWithIn[] {
  const uniqParameters: Record<string, ParameterWithIn> = {};
  for (const parameter of parameters) {
    if (!isParameterWithIn(parameter)) {
      continue;
    }
    uniqParameters[(parameter.name + ':' + parameter.in).toLowerCase()] = parameter;
  }

  return Object.values(uniqParameters);
}
