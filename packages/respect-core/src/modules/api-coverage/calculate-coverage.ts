import {
  BaseResolver,
  getSchemaPropertyPaths,
  getValuePropertyPaths,
  isRef,
  type Oas3Operation,
  type Oas3PathItem,
  type Referenced,
} from '@redocly/openapi-core';

import type {
  CoverageCount,
  CoverageItem,
  RunFileResult,
  SourceDescription,
  SourceDescriptionCoverage,
  Step,
  TestContext,
  WorkflowExecutionResult,
} from '../../types.js';
import { isJsonContentType } from '../../utils/api-fetcher.js';
import {
  getOperationFromDescriptionBySource,
  getRequestBodySchema,
  getResponseKeyByStatusCode,
  getResponseSchema,
} from '../description-parser/index.js';
import { isWorkflowExecutionResult } from '../flow-runner/runner.js';

interface CoverageEntry {
  item: CoverageItem;
  covered: boolean;
}

interface OperationState {
  method: string;
  path: string;
  operationId?: string;
  entries: Map<string, CoverageEntry>;
}

interface DescriptionState {
  name: string;
  url: string;
  // by the lowercase method and the path, for example `get /menu`
  operations: Map<string, OperationState>;
}

const HTTP_METHODS = [
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
  'query',
] as const;

// Cookie parameters are not counted, because a step does not keep the cookies it sent.
const PARAMETER_LOCATIONS = ['path', 'query', 'querystring', 'header'] as const;

// OpenAPI ignores the definitions of these header parameters.
const IGNORED_HEADER_PARAMETERS = ['accept', 'content-type', 'authorization'];

// The other keys of a Responses Object are specification extensions.
const RESPONSE_KEY = /^(default|[1-5](\d\d|XX))$/;

/**
 * Measures how much of the OpenAPI source descriptions the executed steps exercised:
 * the operations they called, the parameters and the JSON body properties they sent,
 * and the response codes and the JSON body properties they received.
 * A description that several files use is reported once.
 */
export function calculateCoverage(
  filesResult: Pick<RunFileResult, 'ctx' | 'executedWorkflows'>[]
): SourceDescriptionCoverage[] {
  const descriptions = new Map<string, DescriptionState>();

  for (const { ctx, executedWorkflows } of filesResult) {
    addDescriptions(ctx, descriptions);
    recordWorkflows(executedWorkflows, descriptions);
  }

  return Array.from(descriptions.values(), toSourceDescriptionCoverage);
}

function recordWorkflows(
  workflows: WorkflowExecutionResult[],
  descriptions: Map<string, DescriptionState>
): void {
  for (const workflow of workflows) {
    // a workflow of another Arazzo file runs with the source descriptions of that file
    addDescriptions(workflow.ctx, descriptions);

    for (const step of workflow.executedSteps) {
      if (isWorkflowExecutionResult(step)) {
        recordWorkflows([step], descriptions);
      } else {
        recordStep(step, workflow.ctx, descriptions);
      }
    }
  }
}

function addDescriptions(ctx: TestContext, descriptions: Map<string, DescriptionState>): void {
  for (const sourceDescription of ctx.sourceDescriptions ?? []) {
    if (sourceDescription.type !== 'openapi') {
      continue;
    }
    const url = resolveSourceDescriptionUrl(sourceDescription, ctx);
    if (descriptions.has(url)) {
      continue;
    }

    // a path without a value is parsed as `null`
    const paths: Record<string, Oas3PathItem | null> =
      ctx.$sourceDescriptions[sourceDescription.name]?.paths ?? {};
    const operations = new Map<string, OperationState>();

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem) {
        continue;
      }
      const pathOperations: Record<string, Referenced<Oas3Operation> | undefined> = {
        ...Object.fromEntries(
          HTTP_METHODS.map((method) => [method.toUpperCase(), pathItem[method]])
        ),
        // the key of an additional operation is the method as it is sent
        ...pathItem.additionalOperations,
      };

      for (const [method, operation] of Object.entries(pathOperations)) {
        if (operation && !isRef(operation)) {
          operations.set(`${method.toLowerCase()} ${path}`, {
            method,
            path,
            operationId: operation.operationId,
            entries: createOperationEntries(operation, pathItem),
          });
        }
      }
    }

    descriptions.set(url, { name: sourceDescription.name, url, operations });
  }
}

// The same location the description is loaded from, so a description that several files use is counted once.
function resolveSourceDescriptionUrl(sourceDescription: SourceDescription, ctx: TestContext) {
  const { externalRefResolver = new BaseResolver(), filePath } = ctx.options;

  return externalRefResolver.resolveExternalRef(filePath, sourceDescription.url);
}

function createOperationEntries(
  operation: Oas3Operation,
  pathItem: Oas3PathItem
): Map<string, CoverageEntry> {
  const entries = new Map<string, CoverageEntry>();
  addEntry(entries, { kind: 'operation' });

  for (const parameter of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
    if (isRef(parameter)) {
      continue;
    }
    const location = PARAMETER_LOCATIONS.find(
      (parameterLocation) => parameterLocation === parameter.in
    );
    if (
      location &&
      !(location === 'header' && IGNORED_HEADER_PARAMETERS.includes(parameter.name.toLowerCase()))
    ) {
      addEntry(entries, { kind: 'parameter', in: location, name: parameter.name });
    }
  }

  const requestBodyContent = isRef(operation.requestBody) ? {} : operation.requestBody?.content;
  for (const [mediaType, mediaTypeObject] of Object.entries(requestBodyContent ?? {})) {
    if (isJsonContentType(mediaType)) {
      for (const path of getSchemaPropertyPaths(mediaTypeObject.schema, 'request')) {
        addEntry(entries, { kind: 'property', target: 'request', path });
      }
    }
  }

  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    if (!RESPONSE_KEY.test(status)) {
      continue;
    }
    addEntry(entries, { kind: 'response', status });
    for (const [mediaType, mediaTypeObject] of Object.entries(response.content ?? {})) {
      if (isJsonContentType(mediaType)) {
        for (const path of getSchemaPropertyPaths(mediaTypeObject.schema, 'response')) {
          addEntry(entries, { kind: 'property', target: 'response', status, path });
        }
      }
    }
  }

  return entries;
}

function recordStep(
  step: Step,
  ctx: TestContext,
  descriptions: Map<string, DescriptionState>
): void {
  const { request, response } = step;
  // a step that calls a workflow, or that got no response, exercised no operation
  if (!request || !response) {
    return;
  }

  // a step with `x-operation` has no operation in a source description
  const operation = getOperationFromDescriptionBySource(step, ctx);
  const sourceDescription = ctx.sourceDescriptions?.find(
    ({ name }) => name === operation?.descriptionName
  );
  if (!operation || !sourceDescription) {
    return;
  }

  const entries = descriptions
    .get(resolveSourceDescriptionUrl(sourceDescription, ctx))
    ?.operations.get(`${operation.method.toLowerCase()} ${operation.path}`)?.entries;
  if (!entries) {
    return;
  }

  markEntry(entries, { kind: 'operation' });

  const queryKeys = Array.from(new URL(response.requestUrl).searchParams.keys());
  for (const entry of entries.values()) {
    if (entry.item.kind !== 'parameter') {
      continue;
    }
    const { name } = entry.item;
    switch (entry.item.in) {
      case 'path':
        entry.covered ||= request.path?.[name] !== undefined;
        break;
      case 'header':
        entry.covered ||= request.header[name.toLowerCase()] !== undefined;
        break;
      case 'query':
        // a `deepObject` parameter is sent as `name[property]=value`
        entry.covered ||= queryKeys.some((key) => key === name || key.startsWith(`${name}[`));
        break;
      case 'querystring':
        entry.covered ||= queryKeys.length > 0;
        break;
    }
  }

  const [requestContentType] = String(request.header['content-type'] ?? '').split(';');
  if (isJsonContentType(requestContentType)) {
    const requestSchema = getRequestBodySchema(requestContentType, operation);
    for (const path of getValuePropertyPaths(request.body, requestSchema, 'request')) {
      markEntry(entries, { kind: 'property', target: 'request', path });
    }
  }

  const status = getResponseKeyByStatusCode(operation.responses ?? {}, response.statusCode);
  if (!status) {
    return;
  }
  markEntry(entries, { kind: 'response', status });

  if (response.contentType && isJsonContentType(response.contentType)) {
    const responseSchema = getResponseSchema({
      statusCode: response.statusCode,
      contentType: response.contentType,
      descriptionResponses: operation.responses,
    });
    for (const path of getValuePropertyPaths(response.body, responseSchema, 'response')) {
      markEntry(entries, { kind: 'property', target: 'response', status, path });
    }
  }
}

function entryKey(item: CoverageItem): string {
  switch (item.kind) {
    case 'operation':
      return 'operation';
    case 'parameter':
      // header names are case-insensitive
      return `parameter:${item.in}:${item.in === 'header' ? item.name.toLowerCase() : item.name}`;
    case 'response':
      return `response:${item.status}`;
    case 'property':
      return `property:${item.target}:${item.status ?? ''}:${item.path}`;
  }
}

function addEntry(entries: Map<string, CoverageEntry>, item: CoverageItem): void {
  const key = entryKey(item);
  if (!entries.has(key)) {
    entries.set(key, { item, covered: false });
  }
}

function markEntry(entries: Map<string, CoverageEntry>, item: CoverageItem): void {
  const entry = entries.get(entryKey(item));
  if (entry) {
    entry.covered = true;
  }
}

function countByKind(operations: OperationState[], kind: CoverageItem['kind']): CoverageCount {
  const count = { covered: 0, total: 0 };
  for (const { entries } of operations) {
    for (const entry of entries.values()) {
      if (entry.item.kind !== kind) {
        continue;
      }
      count.total += 1;
      if (entry.covered) {
        count.covered += 1;
      }
    }
  }
  return count;
}

function toSourceDescriptionCoverage(description: DescriptionState): SourceDescriptionCoverage {
  const operations = Array.from(description.operations.values());

  return {
    name: description.name,
    url: description.url,
    totals: {
      operations: countByKind(operations, 'operation'),
      parameters: countByKind(operations, 'parameter'),
      properties: countByKind(operations, 'property'),
      responses: countByKind(operations, 'response'),
    },
    operations: operations.map(({ entries, ...operation }) => {
      const items = Array.from(entries.values());
      return {
        ...operation,
        covered: items.filter(({ covered }) => covered).map(({ item }) => item),
        missing: items.filter(({ covered }) => !covered).map(({ item }) => item),
      };
    }),
  };
}
