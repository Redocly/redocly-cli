import { isPlainObject } from '@redocly/openapi-core';

import { isPropertyExcludedFromTarget } from '../engine/schema-validator.js';
import { getActualParameterValue, parseCookies } from '../rules/builtins/schema.js';
import type {
  CoverageCount,
  CoverageItem,
  CoverageOperationReport,
  CoverageSummary,
  MatchedOperation,
  NormalizedExchange,
  OpenApiIndex,
  OpenApiOperation,
  RuleContext,
} from '../types/index.js';
import { isJsonMime, pickSchemaByMime } from '../utils/http.js';

type ValidateSchema = RuleContext['validateSchema'];

interface CoverageEntry {
  item: CoverageItem;
  covered: boolean;
  coveredOnAccepted: boolean;
}

interface OperationCoverageState {
  operation: OpenApiOperation;
  entries: Map<string, CoverageEntry>;
}

export interface CoverageCollectorOptions {
  openApiIndex: OpenApiIndex;
  ignoreCookies?: boolean;
  validateSchema: ValidateSchema;
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
    entries.set(key, { item, covered: false, coveredOnAccepted: false });
  }
}

function markEntry(entries: Map<string, CoverageEntry>, item: CoverageItem, accepted: boolean) {
  const entry = entries.get(entryKey(item));
  if (!entry) {
    return;
  }
  entry.covered = true;
  if (accepted) {
    entry.coveredOnAccepted = true;
  }
}

function propertyPath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}.${name}` : name;
}

interface PropertySite {
  target: 'request' | 'response';
  status?: string;
}

/**
 * Register every property reachable from `schema` as a coverage entry. Composed
 * schemas (`allOf`, `oneOf`, `anyOf`) contribute their properties under the same
 * path, so a property declared in several branches is counted once. Dereferenced
 * recursive schemas are circular, so the walk stops when it meets an ancestor.
 */
function collectPropertySites(
  schema: unknown,
  site: PropertySite,
  path: string,
  entries: Map<string, CoverageEntry>,
  ancestors: Set<object>
): void {
  if (!isPlainObject(schema) || ancestors.has(schema)) {
    return;
  }
  ancestors.add(schema);

  for (const branches of [schema.allOf, schema.oneOf, schema.anyOf]) {
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        collectPropertySites(branch, site, path, entries, ancestors);
      }
    }
  }

  if (isPlainObject(schema.properties)) {
    for (const [name, propertySchema] of Object.entries(schema.properties)) {
      if (isPropertyExcludedFromTarget(propertySchema, site.target)) {
        continue;
      }
      const childPath = propertyPath(path, name);
      addEntry(entries, { kind: 'property', ...site, path: childPath });
      collectPropertySites(propertySchema, site, childPath, entries, ancestors);
    }
  }

  if (isPlainObject(schema.items)) {
    collectPropertySites(schema.items, site, `${path}[]`, entries, ancestors);
  }

  ancestors.delete(schema);
}

/**
 * Walk a JSON value together with its schema and mark every documented property
 * the value carries. For `oneOf` / `anyOf`, only the branches the value satisfies
 * are entered, so a payload never credits properties of a sibling branch.
 */
function observeProperties(
  value: unknown,
  schema: unknown,
  site: PropertySite,
  path: string,
  entries: Map<string, CoverageEntry>,
  accepted: boolean,
  validateSchema: ValidateSchema,
  ancestors: Set<object>
): void {
  if (!isPlainObject(schema) || ancestors.has(schema)) {
    return;
  }
  ancestors.add(schema);

  const observeBranch = (branch: unknown) =>
    observeProperties(value, branch, site, path, entries, accepted, validateSchema, ancestors);

  if (Array.isArray(schema.allOf)) {
    schema.allOf.forEach(observeBranch);
  }

  for (const branches of [schema.oneOf, schema.anyOf]) {
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        if (validateSchema(branch, value, { target: site.target }).valid) {
          observeBranch(branch);
        }
      }
    }
  }

  if (isPlainObject(schema.properties) && isPlainObject(value)) {
    for (const [name, propertySchema] of Object.entries(schema.properties)) {
      if (value[name] === undefined) {
        continue;
      }
      const childPath = propertyPath(path, name);
      markEntry(entries, { kind: 'property', ...site, path: childPath }, accepted);
      observeProperties(
        value[name],
        propertySchema,
        site,
        childPath,
        entries,
        accepted,
        validateSchema,
        ancestors
      );
    }
  }

  if (isPlainObject(schema.items) && Array.isArray(value)) {
    for (const element of value) {
      observeProperties(
        element,
        schema.items,
        site,
        `${path}[]`,
        entries,
        accepted,
        validateSchema,
        ancestors
      );
    }
  }

  ancestors.delete(schema);
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
    addEntry(entries, { kind: 'parameter', name: parameter.name, in: parameter.in });
  }

  for (const [mime, schema] of Object.entries(operation.requestBodyContent)) {
    if (isJsonMime(mime)) {
      collectPropertySites(schema, { target: 'request' }, '', entries, new Set());
    }
  }

  for (const status of operation.responseStatuses) {
    addEntry(entries, { kind: 'response', status });
    for (const [mime, schema] of Object.entries(operation.responseBodyContent[status] ?? {})) {
      if (isJsonMime(mime)) {
        collectPropertySites(schema, { target: 'response', status }, '', entries, new Set());
      }
    }
  }

  return { operation, entries };
}

/** Pick the documented response key the way `schema-consistency` does: exact status, then class, then `default`. */
function resolveResponseStatus(operation: OpenApiOperation, status: number): string | undefined {
  const statusClass = `${Math.floor(status / 100)}XX`;
  return [String(status), statusClass, statusClass.toLowerCase(), 'default'].find((candidate) =>
    operation.responseStatuses.includes(candidate)
  );
}

function hasJsonBody(exchange: NormalizedExchange): boolean {
  return exchange.request.bodyJson !== undefined || exchange.response?.bodyJson !== undefined;
}

function countByKind(
  states: OperationCoverageState[],
  kind: CoverageItem['kind']
): CoverageCount & { coveredOnAccepted: number } {
  const count = { covered: 0, total: 0, coveredOnAccepted: 0 };
  for (const state of states) {
    for (const entry of state.entries.values()) {
      if (entry.item.kind !== kind) {
        continue;
      }
      count.total += 1;
      if (entry.covered) {
        count.covered += 1;
      }
      if (entry.coveredOnAccepted) {
        count.coveredOnAccepted += 1;
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
  private readonly validateSchema: ValidateSchema;
  private readonly exchanges = { total: 0, matched: 0, withBody: 0 };

  constructor(options: CoverageCollectorOptions) {
    this.validateSchema = options.validateSchema;
    for (const operations of options.openApiIndex.operationsByMethod.values()) {
      for (const operation of operations) {
        this.states.set(operation, createOperationState(operation, options.ignoreCookies ?? false));
      }
    }
  }

  record(exchange: NormalizedExchange, matchedOperation: MatchedOperation | null): void {
    this.exchanges.total += 1;
    if (!matchedOperation) {
      return;
    }
    this.exchanges.matched += 1;
    if (hasJsonBody(exchange)) {
      this.exchanges.withBody += 1;
    }

    const { operation, pathParams } = matchedOperation;
    const { entries } = this.states.get(operation)!;
    const response = exchange.response;
    const accepted = response !== undefined && response.status < 400;

    markEntry(entries, { kind: 'operation' }, accepted);

    const cookies = parseCookies(exchange.request.headers.cookie);
    for (const parameter of operation.requestParameters) {
      const actualValue = getActualParameterValue(parameter, exchange.request, pathParams, cookies);
      if (actualValue !== undefined && actualValue !== null) {
        markEntry(entries, { kind: 'parameter', name: parameter.name, in: parameter.in }, accepted);
      }
    }

    if (exchange.request.bodyJson !== undefined && isJsonMime(exchange.request.contentType)) {
      const requestSchema = pickSchemaByMime(
        operation.requestBodyContent,
        exchange.request.contentType
      );
      observeProperties(
        exchange.request.bodyJson,
        requestSchema,
        { target: 'request' },
        '',
        entries,
        accepted,
        this.validateSchema,
        new Set()
      );
    }

    if (!response) {
      return;
    }

    const status = resolveResponseStatus(operation, response.status);
    if (status === undefined) {
      return;
    }
    markEntry(entries, { kind: 'response', status }, accepted);

    if (response.bodyJson !== undefined && isJsonMime(response.contentType)) {
      const responseSchema = pickSchemaByMime(
        operation.responseBodyContent[status] ?? {},
        response.contentType
      );
      observeProperties(
        response.bodyJson,
        responseSchema,
        { target: 'response', status },
        '',
        entries,
        accepted,
        this.validateSchema,
        new Set()
      );
    }
  }

  finalize(): CoverageSummary {
    const states = Array.from(this.states.values()).sort(
      (left, right) =>
        left.operation.pathTemplate.localeCompare(right.operation.pathTemplate) ||
        left.operation.method.localeCompare(right.operation.method)
    );

    const operations = countByKind(states, 'operation');
    const parameters = countByKind(states, 'parameter');
    const properties = countByKind(states, 'property');
    const responses = countByKind(states, 'response');
    const covered =
      operations.covered + parameters.covered + properties.covered + responses.covered;
    const total = operations.total + parameters.total + properties.total + responses.total;

    return {
      exchanges: this.exchanges,
      totals: {
        overall: { covered, total, pct: total === 0 ? 0 : Math.round((covered / total) * 100) },
        operations: { covered: operations.covered, total: operations.total },
        parameters: { covered: parameters.covered, total: parameters.total },
        properties,
        responses: { covered: responses.covered, total: responses.total },
      },
      operations: states.map(toOperationReport),
    };
  }
}
