import { isPlainObject } from '@redocly/openapi-core';

import type { FormQuerystringSchema, NormalizedRequest, OpenApiParameter } from '../types/index.js';
import { isJsonMime, parseUrl } from './http.js';

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

export const FORM_URLENCODED = 'application/x-www-form-urlencoded';

const OTHER_KEYS_KEYWORDS = ['additionalProperties', 'patternProperties', 'unevaluatedProperties'];

export function buildFormQuerystringSchema(schema: unknown): FormQuerystringSchema {
  const formSchema: FormQuerystringSchema = {
    properties: new Map(),
    arrayKeys: new Set(),
    jsonKeys: new Set(),
    checksOtherKeys: false,
  };
  collectFormSchema(schema, formSchema, true, new Set());

  for (const [key, propertySchema] of formSchema.properties) {
    const isArray = isPlainObject(propertySchema) && propertySchema.type === 'array';
    if (isArray) {
      formSchema.arrayKeys.add(key);
    }
    if (describesObject(isArray ? propertySchema.items : propertySchema, new Set())) {
      formSchema.jsonKeys.add(key);
    }
  }

  return formSchema;
}

function collectFormSchema(
  schema: unknown,
  formSchema: FormQuerystringSchema,
  appliesToEveryValue: boolean,
  seen: Set<unknown>
): void {
  if (!isPlainObject(schema) || seen.has(schema)) {
    return;
  }
  seen.add(schema);

  if (isPlainObject(schema.properties)) {
    for (const [key, propertySchema] of Object.entries(schema.properties)) {
      formSchema.properties.set(key, propertySchema);
    }
  }

  if (appliesToEveryValue && OTHER_KEYS_KEYWORDS.some((keyword) => schema[keyword] !== undefined)) {
    formSchema.checksOtherKeys = true;
  }

  for (const branch of Array.isArray(schema.allOf) ? schema.allOf : []) {
    collectFormSchema(branch, formSchema, appliesToEveryValue, seen);
  }
  for (const branches of [schema.oneOf, schema.anyOf]) {
    for (const branch of Array.isArray(branches) ? branches : []) {
      collectFormSchema(branch, formSchema, false, seen);
    }
  }
}

function describesObject(schema: unknown, seen: Set<unknown>): boolean {
  if (!isPlainObject(schema) || seen.has(schema)) {
    return false;
  }
  seen.add(schema);

  if (schema.type !== undefined) {
    return Array.isArray(schema.type) ? schema.type.includes('object') : schema.type === 'object';
  }

  return (
    isPlainObject(schema.properties) ||
    [schema.allOf, schema.oneOf, schema.anyOf].some(
      (branches) =>
        Array.isArray(branches) && branches.some((branch) => describesObject(branch, seen))
    )
  );
}

function parseJsonFormValue(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function getQuerystringValue(parameter: OpenApiParameter, request: NormalizedRequest): unknown {
  const { formSchema } = parameter;
  if (formSchema) {
    const keys = [...new Set(request.query.keys())];
    if (keys.length === 0) {
      return undefined;
    }
    return Object.fromEntries(
      keys.map((key) => {
        const values = request.query.getAll(key);
        const parsedValues = formSchema.jsonKeys.has(key) ? values.map(parseJsonFormValue) : values;
        return [
          key,
          formSchema.arrayKeys.has(key) || parsedValues.length > 1 ? parsedValues : parsedValues[0],
        ];
      })
    );
  }

  const encodedQuery = parseUrl(request.url).search.slice(1);
  if (encodedQuery === '') {
    return undefined;
  }

  let decodedQuery: string;
  try {
    decodedQuery = decodeURIComponent(encodedQuery);
  } catch {
    decodedQuery = encodedQuery;
  }

  if (!isJsonMime(parameter.mediaType)) {
    return decodedQuery;
  }

  try {
    return JSON.parse(decodedQuery);
  } catch {
    return undefined;
  }
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
    case 'querystring':
      return getQuerystringValue(parameter, request);
    case 'header':
      return request.headers[parameter.name.toLowerCase()];
    case 'cookie':
      return cookies[parameter.name];
    default:
      return undefined;
  }
}
