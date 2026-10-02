import { isPlainObject } from '@redocly/openapi-core';

import type { NormalizedRequest, OpenApiParameter } from '../types/index.js';

export function parseCookies(headerValue: string | undefined): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const pair of headerValue.split(';')) {
    const [rawName, ...rawValueParts] = pair.trim().split('=');
    if (!rawName) {
      continue;
    }

    const value = rawValueParts.join('=').trim();
    cookies[rawName] = value;
  }

  return cookies;
}

// deepObject-style query parameters serialize object properties as "name[property]=value".
const DEEP_OBJECT_QUERY_KEY_REGEX = /^([^[\]]+)\[([^[\]]+)\]$/;

export function parseDeepObjectQueryKey(
  key: string
): { parameterName: string; property: string } | undefined {
  const keyMatch = key.match(DEEP_OBJECT_QUERY_KEY_REGEX);
  return keyMatch ? { parameterName: keyMatch[1], property: keyMatch[2] } : undefined;
}

function getDeepObjectParameterValue(
  parameterName: string,
  query: URLSearchParams
): Record<string, string> | undefined {
  let objectValue: Record<string, string> | undefined;
  for (const [key, value] of query) {
    const deepObjectKey = parseDeepObjectQueryKey(key);
    if (deepObjectKey?.parameterName === parameterName) {
      objectValue ??= {};
      objectValue[deepObjectKey.property] = value;
    }
  }

  return objectValue;
}

export function getActualParameterValue(
  parameter: OpenApiParameter,
  request: NormalizedRequest,
  pathParams: Record<string, string>,
  cookies: Record<string, string>
): unknown {
  switch (parameter.in) {
    case 'path':
      return pathParams[parameter.name];
    case 'query': {
      if (parameter.style === 'deepObject') {
        return getDeepObjectParameterValue(parameter.name, request.query);
      }
      const values = request.query.getAll(parameter.name);
      if (values.length === 0) {
        return undefined;
      }
      const schemaType = isPlainObject(parameter.schema) ? parameter.schema.type : undefined;
      if (schemaType === 'array' || values.length > 1) {
        return values;
      }
      return values[0];
    }
    case 'header':
      return request.headers[parameter.name.toLowerCase()];
    case 'cookie':
      return cookies[parameter.name];
    default:
      return undefined;
  }
}
