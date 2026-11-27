import {
  getSchemaPropertyPaths,
  getValuePropertyPaths,
  isPlainObject,
  isPropertyExcludedFromTarget,
} from '@redocly/openapi-core';

import type {
  CoverageCount,
  CoverageItem,
  CoverageOperationReport,
  CoverageSummary,
  MatchedOperation,
  NormalizedExchange,
  OpenApiIndex,
  OpenApiOperation,
} from '../types/index.js';
import { isJsonMime, pickSchemaByMime } from '../utils/http.js';
import { resolveResponseKey } from '../utils/openapi.js';
import { getActualParameterValue } from '../utils/parameters.js';

interface CoverageEntry {
  item: CoverageItem;
  covered: boolean;
}

interface OperationCoverageState {
  operation: OpenApiOperation;
  entries: Map<string, CoverageEntry>;
}

interface CoverageCollectorOptions {
  openApiIndex: OpenApiIndex;
  ignoreCookies: boolean;
}

function entryKey(item: CoverageItem): string {
  switch (item.kind) {
    case 'operation':
      return 'operation';
    case 'parameter':
      return `parameter:${item.in}:${item.name}`;
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

function createOperationState(
  operation: OpenApiOperation,
  ignoreCookies: boolean
): OperationCoverageState {
  const entries = new Map<string, CoverageEntry>();
  addEntry(entries, { kind: 'operation' });

  for (const parameter of operation.requestParameters) {
    if (ignoreCookies && parameter.in === 'cookie') {
      continue;
    }

    const formKeyNames = [...(parameter.formSchema?.properties ?? [])]
      .filter(([, propertySchema]) => !isPropertyExcludedFromTarget(propertySchema, 'request'))
      .map(([key]) => `${parameter.name}.${key}`);

    for (const name of formKeyNames.length > 0 ? formKeyNames : [parameter.name]) {
      addEntry(entries, { kind: 'parameter', name, in: parameter.in });
    }
  }

  for (const [mime, schema] of Object.entries(operation.requestBodyContent)) {
    if (isJsonMime(mime)) {
      for (const path of getSchemaPropertyPaths(schema, 'request')) {
        addEntry(entries, { kind: 'property', target: 'request', path });
      }
    }
  }

  for (const status of operation.responseStatuses) {
    addEntry(entries, { kind: 'response', status });
    for (const [mime, schema] of Object.entries(operation.responseBodyContent[status] ?? {})) {
      if (isJsonMime(mime)) {
        for (const path of getSchemaPropertyPaths(schema, 'response')) {
          addEntry(entries, { kind: 'property', target: 'response', status, path });
        }
      }
    }
  }

  return { operation, entries };
}

function hasJsonBody(exchange: NormalizedExchange): boolean {
  return exchange.request.bodyJson !== undefined || exchange.response?.bodyJson !== undefined;
}

function countByKind(states: OperationCoverageState[], kind: CoverageItem['kind']): CoverageCount {
  const count = { covered: 0, total: 0 };
  for (const state of states) {
    for (const entry of state.entries.values()) {
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

function toOperationReport(state: OperationCoverageState): CoverageOperationReport {
  const report: CoverageOperationReport = {
    method: state.operation.method.toUpperCase(),
    path: state.operation.pathTemplate,
    operationId: state.operation.operationId,
    missing: [],
    covered: [],
  };
  for (const entry of state.entries.values()) {
    (entry.covered ? report.covered : report.missing).push(entry.item);
  }
  return report;
}

/**
 * Accumulates which documented operations, parameters, JSON body properties,
 * and response codes the processed exchanges exercised.
 */
export class CoverageCollector {
  private readonly states = new Map<OpenApiOperation, OperationCoverageState>();
  private readonly exchanges = { total: 0, matched: 0, withBody: 0 };

  constructor(options: CoverageCollectorOptions) {
    for (const operations of options.openApiIndex.operationsByMethod.values()) {
      for (const operation of operations) {
        this.states.set(operation, createOperationState(operation, options.ignoreCookies));
      }
    }
  }

  record(
    exchange: NormalizedExchange,
    matchedOperation: MatchedOperation | null,
    cookies: Record<string, string>
  ): void {
    this.exchanges.total += 1;
    if (!matchedOperation) {
      return;
    }
    const state = this.states.get(matchedOperation.operation);
    if (!state) {
      return;
    }
    this.exchanges.matched += 1;
    if (hasJsonBody(exchange)) {
      this.exchanges.withBody += 1;
    }

    const { operation, pathParams } = matchedOperation;
    const { entries } = state;

    markEntry(entries, { kind: 'operation' });

    for (const parameter of operation.requestParameters) {
      const actualValue = getActualParameterValue(parameter, exchange.request, pathParams, cookies);
      if (actualValue === undefined) {
        continue;
      }
      markEntry(entries, { kind: 'parameter', name: parameter.name, in: parameter.in });
      if (parameter.formSchema && isPlainObject(actualValue)) {
        for (const key of Object.keys(actualValue)) {
          markEntry(entries, {
            kind: 'parameter',
            name: `${parameter.name}.${key}`,
            in: parameter.in,
          });
        }
      }
    }

    if (exchange.request.bodyJson !== undefined) {
      const requestSchema = pickSchemaByMime(
        operation.requestBodyContent,
        exchange.request.contentType
      );
      const { bodyJson } = exchange.request;
      for (const path of getValuePropertyPaths(bodyJson, requestSchema, 'request')) {
        markEntry(entries, { kind: 'property', target: 'request', path });
      }
    }

    const response = exchange.response;
    if (!response) {
      return;
    }

    const status = resolveResponseKey(response.status, operation.responseStatuses);
    if (status === undefined) {
      return;
    }
    markEntry(entries, { kind: 'response', status });

    if (response.bodyJson !== undefined) {
      const responseSchema = pickSchemaByMime(
        operation.responseBodyContent[status] ?? {},
        response.contentType
      );
      for (const path of getValuePropertyPaths(response.bodyJson, responseSchema, 'response')) {
        markEntry(entries, { kind: 'property', target: 'response', status, path });
      }
    }
  }

  finalize(): CoverageSummary {
    const states = Array.from(this.states.values()).sort(
      (left, right) =>
        left.operation.pathTemplate.localeCompare(right.operation.pathTemplate) ||
        left.operation.method.localeCompare(right.operation.method)
    );

    return {
      exchanges: this.exchanges,
      totals: {
        operations: countByKind(states, 'operation'),
        parameters: countByKind(states, 'parameter'),
        properties: countByKind(states, 'property'),
        responses: countByKind(states, 'response'),
      },
      operations: states.map(toOperationReport),
    };
  }
}
