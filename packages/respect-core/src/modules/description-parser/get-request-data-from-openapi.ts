import { isPlainObject, type LoggerInterface } from '@redocly/openapi-core';

import type { Parameter } from '../../types.js';
import {
  generateTestDataFromJsonSchema,
  generateExampleValue,
} from '../arazzo-description-generator/index.js';
import { isParameterWithIn, type ParameterWithIn } from '../context-parser/index.js';
import { extractFirstExample } from './extract-first-example.js';
import type { OperationDetails } from './get-operation-from-description.js';

export interface OpenApiRequestData {
  requestBody?: unknown;
  contentType?: string;
  parameters: ParameterWithIn[];
  contentTypeParameters: ParameterWithIn[];
}

export function getRequestDataFromOpenApi(
  operation: OperationDetails & Record<string, any>,
  logger: LoggerInterface
): OpenApiRequestData {
  const content: Record<string, any> = operation?.requestBody?.content || {};
  const [contentType, contentItem]: [string, any] = Object.entries(content)[0] || [];

  const requestBody =
    contentItem?.example ||
    extractFirstExample(contentItem?.examples) ||
    generateTestDataFromJsonSchema(contentItem?.schema, logger);

  const accept = getAcceptHeader(operation);
  const parameters = getUniqueParameters([
    ...transformParameters(operation.pathParameters, logger),
    ...transformParameters(operation.parameters, logger),
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

function transformParameters(params: Parameter[], logger: LoggerInterface): ParameterWithIn[] {
  return (params || [])
    .filter(
      (parameter): parameter is ParameterWithIn & { required: true } => parameter?.required === true
    )
    .map((parameter) => {
      if (isParameterWithIn(parameter)) {
        return {
          name: parameter.name,
          in: parameter.in,
          value:
            parameter.in === 'querystring'
              ? generateQuerystringValue(parameter, logger)
              : generateExampleValue(parameter, logger),
          ...(parameter.allowReserved && { allowReserved: parameter.allowReserved }),
        } as ParameterWithIn;
      }
      // Return undefined for non-matching parameters
      return undefined;
    })
    .filter((parameter): parameter is ParameterWithIn => parameter !== undefined);
}

// A querystring parameter describes the whole query string with `content`, the same way as a request body.
function generateQuerystringValue(parameter: Parameter, logger: LoggerInterface) {
  const [mediaType, mediaTypeObject] = Object.entries(parameter.content || {})[0] || [];
  const example =
    mediaTypeObject?.example ??
    extractFirstExample(mediaTypeObject?.examples) ??
    generateTestDataFromJsonSchema(mediaTypeObject?.schema, logger);

  if (mediaType === 'application/x-www-form-urlencoded' && isPlainObject(example)) {
    return new URLSearchParams(
      Object.entries(example).map(([name, value]) => [name, String(value)])
    ).toString();
  }

  // Any other structured example is sent as JSON.
  return typeof example === 'string' || example === undefined ? example : JSON.stringify(example);
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
