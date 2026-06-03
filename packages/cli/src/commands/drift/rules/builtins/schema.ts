import type {
  Finding,
  MatchedOperation,
  OpenApiParameter,
  RuleContext,
  RulePlugin,
  SchemaValidationError,
} from '../../types/index.js';
import {
  pickSchemaByMime,
  shouldIgnoreHeaderAsUndocumented,
  isJsonMime,
} from '../../utils/http.js';

const MAX_ACTUAL_VALUE_LENGTH = 200;

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

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
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
  schema: unknown,
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
    path: highlightedDataPath ?? '/',
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

  const result = context.validateSchema(parameter.schema, actualValue);
  if (result.valid) {
    return;
  }

  for (const error of result.errors) {
    const details = createSchemaErrorDetails(parameter.schema, actualValue, error, 'request');
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

function getActualParameterValue(
  parameter: OpenApiParameter,
  context: RuleContext,
  cookies: Record<string, string>
): unknown {
  switch (parameter.in) {
    case 'path':
      return context.matchedOperation?.pathParams[parameter.name];
    case 'query':
      return context.exchange.request.query.get(parameter.name) ?? undefined;
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

  for (const parameter of matchedOperation.operation.requestParameters) {
    if (parameter.in === 'header' || parameter.in === 'query' || parameter.in === 'cookie') {
      paramsByLocation[parameter.in].add(parameter.name.toLowerCase());
    }
  }

  for (const [name] of context.exchange.request.query.entries()) {
    if (!paramsByLocation.query.has(name.toLowerCase())) {
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
  }

  for (const headerName of Object.keys(context.exchange.request.headers)) {
    if (shouldIgnoreHeaderAsUndocumented(headerName)) {
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
    matchedOperation.operation.responseBodyContent.default;

  if (!responseContentMap) {
    return undefined;
  }

  return pickSchemaByMime(responseContentMap, response.headers['content-type']);
}

function validateSchemaResult(
  schema: unknown,
  value: unknown,
  context: RuleContext,
  target: 'request' | 'response'
): Finding[] {
  const result = context.validateSchema(schema, value);
  if (result.valid) {
    return [];
  }

  return result.errors.map((error) => {
    const details = createSchemaErrorDetails(schema, value, error, target);
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

export class SchemaConsistencyRule implements RulePlugin {
  public readonly id = 'schema-consistency';

  public analyze(context: RuleContext): Finding[] {
    const matchedOperation = context.matchedOperation;
    if (!matchedOperation) {
      return [];
    }

    const findings: Finding[] = [];
    const cookies = parseCookies(context.exchange.request.headers.cookie);

    findings.push(...createUndocumentedParameterFindings(context, matchedOperation));

    for (const parameter of matchedOperation.operation.requestParameters) {
      if (context.ignoreCookies && parameter.in === 'cookie') {
        continue;
      }

      const actualValue = getActualParameterValue(parameter, context, cookies);

      if (
        parameter.required &&
        (actualValue === undefined || actualValue === null || actualValue === '')
      ) {
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

    const requestContentType = context.exchange.request.headers['content-type'];
    const requestSchema = pickSchemaByMime(
      matchedOperation.operation.requestBodyContent,
      requestContentType
    );

    if (
      matchedOperation.operation.requestBodyRequired &&
      requestSchema &&
      context.exchange.request.bodyText === undefined
    ) {
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

    if (requestSchema && context.exchange.request.bodyText !== undefined) {
      if (isJsonMime(requestContentType) && context.exchange.request.bodyJson === undefined) {
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
        const requestPayload =
          context.exchange.request.bodyJson ?? context.exchange.request.bodyText;
        findings.push(...validateSchemaResult(requestSchema, requestPayload, context, 'request'));
      }
    }

    const responseSchema = pickResponseSchema(context, matchedOperation);
    if (responseSchema && context.exchange.response) {
      const responseContentType = context.exchange.response.headers['content-type'];
      if (isJsonMime(responseContentType) && context.exchange.response.bodyJson === undefined) {
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
        const responsePayload =
          context.exchange.response.bodyJson ?? context.exchange.response.bodyText;
        findings.push(
          ...validateSchemaResult(responseSchema, responsePayload, context, 'response')
        );
      }
    }

    return findings;
  }
}
