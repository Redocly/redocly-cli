import { isPlainObject, isRef } from '@redocly/openapi-core';

import { isHttpMethod } from '../../drift/openapi/loader.js';
import { declared, resolve, type Schema } from './schema.js';
import { collectSites, siteKey } from './sites.js';
import type { Coverage } from './walk.js';

export interface UnusedVariant {
  path: string;
  keyword: string;
  branches: number[];
}

export interface SchemaCoverage {
  name: string;
  /** Whether a value reached this schema, regardless of what it carried. */
  reached: boolean;
  seen: number;
  count: number;
  unusedProperties: string[];
  unusedVariants: UnusedVariant[];
}

export interface OperationCoverage {
  seen: number;
  total: number;
  /** `GET /path  operationId`, for the operations nothing reached. */
  unused: string[];
}

export interface ExchangeCounts {
  /** Exchanges parsed from the traffic logs. */
  total: number;
  /** Those carrying a body a schema described, the only ones coverage can read. */
  withBody: number;
}

export interface CoverageReport {
  exchanges: ExchangeCounts;
  operations: OperationCoverage;
  seenProperties: number;
  /**
   * The same count over exchanges the API accepted. Testing a rejection is real
   * coverage, so it stays in `seenProperties`; the gap between the two says how
   * much of the figure a broken run could be propping up.
   */
  seenPropertiesAccepted: number;
  totalProperties: number;
  schemas: SchemaCoverage[];
  unusedSchemas: string[];
}

/** Which documented operations the traffic reached, keyed as `method path`. */
function summarizeOperations(spec: Schema, exercised: Set<string>): OperationCoverage {
  const unused: string[] = [];
  let total = 0;

  for (const [pathTemplate, item] of Object.entries(spec.paths ?? {}) as [string, Schema][]) {
    const { schema: pathItem } = resolve(spec, item);
    if (!pathItem) continue;

    for (const [method, operation] of Object.entries(pathItem) as [string, Schema][]) {
      // A path item also carries `parameters`, `summary`, and `$ref`, none of
      // which are operations.
      if (!isHttpMethod(method) || !isPlainObject(operation)) continue;

      total += 1;
      if (exercised.has(`${method} ${pathTemplate}`)) continue;

      const { operationId } = operation as Schema;
      unused.push(`${method.toUpperCase()} ${pathTemplate}${operationId ? `  ${operationId}` : ''}`);
    }
  }

  return { seen: total - unused.length, total, unused: unused.sort() };
}

export function summarize(
  spec: Schema,
  coverage: Coverage,
  exchanges: ExchangeCounts,
  schemaFilter?: string,
  exercisedOperations: Set<string> = new Set(),
  seenPropertiesAccepted?: number
): CoverageReport {
  const schemas: SchemaCoverage[] = [];
  const unusedSchemas: string[] = [];
  let seenProperties = 0;
  let totalProperties = 0;

  const components = (spec.components?.schemas ?? {}) as Record<string, Schema>;

  for (const [name, schema] of Object.entries(components)) {
    if (schemaFilter && name !== schemaFilter) continue;
    // An alias declares nothing of its own; the schema it points at reports it.
    if (isRef(schema)) continue;

    const names = declared(spec, schema).map(([property]) => property);
    const sites = collectSites(schema, name);
    const reached = coverage.visited.has(name);

    // An enum, a primitive, or an array of `$ref`s holds nothing to break down,
    // but the traffic still either reached it or did not.
    if (!reached) unusedSchemas.push(name);
    if (names.length === 0 && sites.size === 0) continue;

    const seenPropertyPaths = coverage.properties.get(name) ?? new Set<string>();
    const unusedProperties = names.filter((property) => !seenPropertyPaths.has(property)).sort();

    const unusedVariants = [...sites.values()]
      .map(({ path, keyword, count }) => {
        const seenBranches = coverage.variants.get(siteKey(name, path, keyword)) ?? new Set<number>();
        const branches = [...Array.from({ length: count }).keys()].filter(
          (index) => !seenBranches.has(index)
        );

        return { path, keyword, branches };
      })
      .filter(({ branches }) => branches.length > 0)
      .sort((a, b) => a.path.localeCompare(b.path));

    const seen = names.length - unusedProperties.length;

    totalProperties += names.length;
    seenProperties += seen;
    schemas.push({ name, reached, seen, count: names.length, unusedProperties, unusedVariants });
  }

  return {
    exchanges,
    operations: summarizeOperations(spec, exercisedOperations),
    seenProperties,
    seenPropertiesAccepted: seenPropertiesAccepted ?? seenProperties,
    totalProperties,
    schemas: schemas.sort((a, b) => a.name.localeCompare(b.name)),
    unusedSchemas: unusedSchemas.sort(),
  };
}
