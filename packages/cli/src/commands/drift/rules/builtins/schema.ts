import { isPlainObject } from '@redocly/openapi-core';

import type {
  Finding,
  MatchedOperation,
  OpenApiParameter,
  RuleContext,
  TrafficRule,
  SchemaValidationError,
} from '../../types/index.js';
import {
  pickSchemaByMime,
  shouldIgnoreHeaderAsUndocumented,
  isJsonMime,
} from '../../utils/http.js';

const MAX_ACTUAL_VALUE_LENGTH = 200;

function hasBodyContent(bodyText: string | undefined): boolean {
  return bodyText !== undefined && bodyText !== '';
}

function parseCookies(headerValue: string | undefined): Record<string, string> {
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

function decodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function encodeJsonPointerSegment(segment: string): string {
  return segment.replace(/~/g, '~0').replace(/\//g, '~1');
}

function normalizeJsonPointer(pointer: string | undefined): string {
  if (!pointer || pointer === '#') {
    return '';
  }

  if (pointer.startsWith('#')) {
    return pointer.slice(1);
  }

  return pointer;
}

function jsonPointerSegments(pointer: string | undefined): string[] {
  const normalized = normalizeJsonPointer(pointer);
  if (!normalized || normalized === '/') {
    return [];
  }

  return normalized
    .split('/')
    .slice(1)
    .map((segment) => decodeJsonPointerSegment(segment));
}

function joinJsonPointer(basePath: string, segment: string): string {
  const baseSegments = jsonPointerSegments(basePath);
  return `/${[...baseSegments, encodeJsonPointerSegment(segment)].join('/')}`;
}

function getValueAtJsonPointer(root: unknown, pointer: string | undefined): unknown {
  const segments = jsonPointerSegments(pointer);
  let current: unknown = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (!isPlainObject(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function normalizeDataPathForError(error: SchemaValidationError): string {
  const basePath = error.instancePath ?? '';
  const params = error.params ?? {};

  if (error.keyword === 'required' && typeof params.missingProperty === 'string') {
    return joinJsonPointer(basePath, params.missingProperty);
  }

  if (error.keyword === 'additionalProperties' && typeof params.additionalProperty === 'string') {
    return joinJsonPointer(basePath, params.additionalProperty);
  }

  return basePath;
}

function renderReadablePath(pointer: string): string {
  const segments = jsonPointerSegments(pointer);
  if (segments.length === 0) {
    return 'root';
  }

  const pathParts: string[] = [];
  for (const segment of segments) {
    if (/^\d+$/.test(segment)) {
      pathParts.push(`[${segment}]`);
    } else if (pathParts.length === 0) {
      pathParts.push(segment);
    } else {
      pathParts.push(`.${segment}`);
    }
  }

  return pathParts.join('');
}

function compactActualValue(value: unknown): string {
  if (value === undefined) {
    return '[missing]';
  }

  const serialized = JSON.stringify(value);
  if (!serialized) {
    return String(value);
  }

  return serialized.length > MAX_ACTUAL_VALUE_LENGTH
    ? `${serialized.slice(0, MAX_ACTUAL_VALUE_LENGTH)}…`
    : serialized;
}

function createExpectedHint(error: SchemaValidationError): string | undefined {
  const params = error.params ?? {};
  if (error.keyword === 'required' && typeof params.missingProperty === 'string') {
    return `required field "${params.missingProperty}"`;
  }

  if (error.keyword === 'type' && typeof params.type === 'string') {
    return `type "${params.type}"`;
  }

  if (error.keyword === 'additionalProperties') {
    return 'no additional undocumented properties';
  }

  if (error.keyword === 'format' && typeof params.format === 'string') {
    return `format "${params.format}"`;
  }

  return undefined;
}

function createFallbackSchemaErrorSummary(
  target: 'request' | 'response',
  error: SchemaValidationError,
  highlightedDataPath: string
): string {
  const targetLabel = target === 'request' ? 'Request' : 'Response';
  const params = error.params ?? {};
  const location = renderReadablePath(highlightedDataPath);

  if (error.keyword === 'required' && typeof params.missingProperty === 'string') {
    return `${targetLabel} is missing required field "${location}".`;
  }

  if (error.keyword === 'additionalProperties' && typeof params.additionalProperty === 'string') {
    return `${targetLabel} has undocumented field "${location}".`;
  }

  if (error.keyword === 'type' && typeof params.type === 'string') {
    return `${targetLabel} field "${location}" must be ${params.type}.`;
  }

  if (error.keyword === 'enum') {
    return `${targetLabel} field "${location}" has a value outside allowed enum values.`;
  }

  if (error.keyword === 'format' && typeof params.format === 'string') {
    return `${targetLabel} field "${location}" does not match format "${params.format}".`;
  }

  return `${targetLabel} schema mismatch at "${location}": ${error.message ?? 'validation error'}`;
}

function createSchemaErrorDetails(
  value: unknown,
  error: SchemaValidationError,
  target: 'request' | 'response'
): Record<string, unknown> {
  const highlightedDataPath = normalizeDataPathForError(error);
  const actualValue = getValueAtJsonPointer(value, highlightedDataPath);
  const summary = createFallbackSchemaErrorSummary(target, error, highlightedDataPath);

  return {
    summary,
    keyword: error.keyword ?? null,
    path: highlightedDataPath || '/',
    expected: createExpectedHint(error) ?? null,
    actual: compactActualValue(actualValue),
    suggestion: null,
    params: error.params ?? {},
    ajvMessage: error.message ?? 'validation error',
  };
}

function validateParameter(
  parameter: OpenApiParameter,
  actualValue: unknown,
  context: RuleContext,
  findings: Finding[]
): void {
  if (actualValue === undefined || actualValue === null || !parameter.schema) {
    return;
  }

  const result = context.validateSchema(parameter.schema, actualValue, { coerce: true });
  if (result.valid) {
    return;
  }

  for (const error of result.errors) {
    const details = createSchemaErrorDetails(actualValue, error, 'request');
    findings.push({
      ruleId: 'schema-consistency',
      severity: 'error',
      category: 'schema',
      message: `Invalid ${parameter.in} parameter "${parameter.name}": ${
        typeof details.summary === 'string' ? details.summary : (error.message ?? 'schema mismatch')
      }`,
      exchangeIndex: context.exchange.index,
      operationId: context.matchedOperation?.operation.operationId,
      specSource: context.matchedOperation?.operation.specSource,
      target: 'request',
      schemaPath: error.schemaPath,
      dataPath: normalizeDataPathForError(error),
      details: {
        ...details,
        parameter: {
          name: parameter.name,
          in: parameter.in,
        },
      },
    });
  }
}

// deepObject-style query parameters serialize object properties as "name[property]=value".
const DEEP_OBJECT_QUERY_KEY_REGEX = /^([^[\]]+)\[([^[\]]+)\]$/;

function parseDeepObjectQueryKey(
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

function getActualParameterValue(
  parameter: OpenApiParameter,
  context: RuleContext,
  cookies: Record<string, string>
): unknown {
  switch (parameter.in) {
    case 'path':
      return context.matchedOperation?.pathParams[parameter.name];
    case 'query': {
      if (parameter.style === 'deepObject') {
        return getDeepObjectParameterValue(parameter.name, context.exchange.request.query);
      }
      const values = context.exchange.request.query.getAll(parameter.name);
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
      return context.exchange.request.headers[parameter.name.toLowerCase()];
    case 'cookie':
      return cookies[parameter.name];
    default:
      return undefined;
  }
}

function createUndocumentedParameterFindings(
  context: RuleContext,
  matchedOperation: MatchedOperation
): Finding[] {
  const findings: Finding[] = [];
  const paramsByLocation = {
    query: new Set<string>(),
    header: new Set<string>(),
    cookie: new Set<string>(),
  };
  const deepObjectQueryParams = new Set<string>();

  for (const parameter of matchedOperation.operation.requestParameters) {
    if (parameter.in === 'header') {
      paramsByLocation.header.add(parameter.name.toLowerCase());
    } else if (parameter.in === 'query' || parameter.in === 'cookie') {
      paramsByLocation[parameter.in].add(parameter.name);
      if (parameter.in === 'query' && parameter.style === 'deepObject') {
        deepObjectQueryParams.add(parameter.name);
      }
    }
  }

  for (const name of new Set(context.exchange.request.query.keys())) {
    if (paramsByLocation.query.has(name)) {
      continue;
    }

    const deepObjectKey = parseDeepObjectQueryKey(name);
    if (deepObjectKey && deepObjectQueryParams.has(deepObjectKey.parameterName)) {
      continue;
    }

    findings.push({
      ruleId: 'schema-consistency',
      severity: 'warning',
      category: 'documentation',
      message: `Undocumented query parameter in traffic: "${name}"`,
      exchangeIndex: context.exchange.index,
      operationId: matchedOperation.operation.operationId,
      specSource: matchedOperation.operation.specSource,
      target: 'request',
    });
  }

  for (const headerName of Object.keys(context.exchange.request.headers)) {
    if (shouldIgnoreHeaderAsUndocumented(headerName, context.ignoreHeaders)) {
      continue;
    }

    if (!paramsByLocation.header.has(headerName.toLowerCase())) {
      findings.push({
        ruleId: 'schema-consistency',
        severity: 'info',
        category: 'documentation',
        message: `Undocumented header in traffic: "${headerName}"`,
        exchangeIndex: context.exchange.index,
        operationId: matchedOperation.operation.operationId,
        specSource: matchedOperation.operation.specSource,
        target: 'request',
      });
    }
  }

  return findings;
}

function isRequestRejectedByServer(context: RuleContext): boolean {
  const response = context.exchange.response;
  return response !== undefined && response.status >= 400 && response.status < 500;
}

function pickResponseSchema(
  context: RuleContext,
  matchedOperation: MatchedOperation
): unknown | undefined {
  const response = context.exchange.response;
  if (!response) {
    return undefined;
  }

  const statusCode = String(response.status);
  const statusClass = `${Math.floor(response.status / 100)}XX`;
  const responseContentMap =
    matchedOperation.operation.responseBodyContent[statusCode] ??
    matchedOperation.operation.responseBodyContent[statusClass] ??
    matchedOperation.operation.responseBodyContent[statusClass.toLowerCase()] ??
    matchedOperation.operation.responseBodyContent.default;

  if (!responseContentMap) {
    return undefined;
  }

  return pickSchemaByMime(responseContentMap, response.contentType);
}

function validateSchemaResult(
  schema: unknown,
  value: unknown,
  context: RuleContext,
  target: 'request' | 'response'
): Finding[] {
  const result = context.validateSchema(schema, value, { target });
  if (result.valid) {
    return [];
  }

  return result.errors.map((error) => {
    const details = createSchemaErrorDetails(value, error, target);
    return {
      ruleId: 'schema-consistency',
      severity: 'error' as const,
      category: 'schema' as const,
      message:
        typeof details.summary === 'string'
          ? details.summary
          : `Schema mismatch (${target}): ${error.message ?? 'validation error'}`,
      exchangeIndex: context.exchange.index,
      operationId: context.matchedOperation?.operation.operationId,
      specSource: context.matchedOperation?.operation.specSource,
      target,
      schemaPath: error.schemaPath,
      dataPath: normalizeDataPathForError(error),
      details,
    };
  });
}

export class SchemaConsistencyRule implements TrafficRule {
  public readonly id = 'schema-consistency';

  public analyze(context: RuleContext): Finding[] {
    const matchedOperation = context.matchedOperation;
    if (!matchedOperation) {
      return [];
    }

    const findings: Finding[] = [];
    const cookies = parseCookies(context.exchange.request.headers.cookie);

    // Undocumented query parameters and headers are a documentation gap that holds
    // regardless of whether the server accepted the request, so report them even
    // when the response is a 4xx.
    findings.push(...createUndocumentedParameterFindings(context, matchedOperation));

    // A 4xx response means the server rejected the request, so it never held the
    // request to the operation's success-path contract. Validating that request
    // against required parameters or the request-body schema would report the
    // server's own correct rejection as drift, so skip the request-side checks.
    if (!isRequestRejectedByServer(context)) {
      for (const parameter of matchedOperation.operation.requestParameters) {
        if (context.ignoreCookies && parameter.in === 'cookie') {
          continue;
        }

        const actualValue = getActualParameterValue(parameter, context, cookies);

        if (parameter.required && (actualValue === undefined || actualValue === null)) {
          findings.push({
            ruleId: this.id,
            severity: 'error',
            category: 'documentation',
            message: `Missing required ${parameter.in} parameter: "${parameter.name}"`,
            exchangeIndex: context.exchange.index,
            operationId: matchedOperation.operation.operationId,
            specSource: matchedOperation.operation.specSource,
            target: 'request',
          });
          continue;
        }

        validateParameter(parameter, actualValue, context, findings);
      }

      const requestContentType = context.exchange.request.contentType;
      const requestSchema = pickSchemaByMime(
        matchedOperation.operation.requestBodyContent,
        requestContentType
      );

      const hasRequestBody = hasBodyContent(context.exchange.request.bodyText);

      if (matchedOperation.operation.requestBodyRequired && !hasRequestBody) {
        findings.push({
          ruleId: this.id,
          severity: 'error',
          category: 'documentation',
          message: 'Missing required request body',
          exchangeIndex: context.exchange.index,
          operationId: matchedOperation.operation.operationId,
          specSource: matchedOperation.operation.specSource,
          target: 'request',
        });
      }

      if (requestSchema && hasRequestBody && isJsonMime(requestContentType)) {
        if (context.exchange.request.bodyJson === undefined) {
          findings.push({
            ruleId: this.id,
            severity: 'error',
            category: 'schema',
            message: 'Request body is not valid JSON for JSON content-type',
            exchangeIndex: context.exchange.index,
            operationId: matchedOperation.operation.operationId,
            specSource: matchedOperation.operation.specSource,
            target: 'request',
          });
        } else {
          findings.push(
            ...validateSchemaResult(
              requestSchema,
              context.exchange.request.bodyJson,
              context,
              'request'
            )
          );
        }
      }
    }

    const responseSchema = pickResponseSchema(context, matchedOperation);
    if (
      responseSchema &&
      context.exchange.response &&
      hasBodyContent(context.exchange.response.bodyText)
    ) {
      const responseContentType = context.exchange.response.contentType;
      if (isJsonMime(responseContentType)) {
        if (context.exchange.response.bodyJson === undefined) {
          findings.push({
            ruleId: this.id,
            severity: 'error',
            category: 'schema',
            message: 'Response body is not valid JSON for JSON content-type',
            exchangeIndex: context.exchange.index,
            operationId: matchedOperation.operation.operationId,
            specSource: matchedOperation.operation.specSource,
            target: 'response',
          });
        } else {
          findings.push(
            ...validateSchemaResult(
              responseSchema,
              context.exchange.response.bodyJson,
              context,
              'response'
            )
          );
        }
      }
    }

    return findings;
  }
}
