import { isPlainObject } from '@redocly/openapi-core';
import {
  generateTestDataFromJsonSchema,
  generateExampleValue,
} from '../arazzo-description-generator/index.js';
import { extractFirstExample } from './extract-first-example.js';
import { isParameterWithIn } from '../context-parser/index.js';

import type { Parameter } from '../../types.js';
import type { ParameterWithIn } from '../context-parser/index.js';
import type { OperationDetails } from './get-operation-from-description.js';

export interface OpenApiRequestData {
  requestBody?: Record<string, unknown>;
  contentType?: string;
  parameters: ParameterWithIn[];
  contentTypeParameters: ParameterWithIn[];
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
    ...transformParameters(operation.parameters),
  ]).filter(({ value }) => value);

  return {
    parameters,
    contentTypeParameters: [
      ...(contentType ? [{ name: 'content-type', in: 'header' as const, value: contentType }] : []),
      ...(accept ? [{ name: 'accept', in: 'header' as const, value: accept }] : []),
    ],
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
