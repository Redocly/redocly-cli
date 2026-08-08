import { isPlainObject } from '@redocly/openapi-core';

import { isHttpMethod } from '../../drift/openapi/loader.js';
import { resolve, type Schema } from './schema.js';

export interface StatusCoverage {
  seen: number;
  total: number;
  /** `GET /path  404`, for the documented responses nothing produced. */
  unused: string[];
}

/** Operation key → the response keys the traffic produced. */
export type StatusUse = Map<string, Set<string>>;

export function createStatusUse(): StatusUse {
  return new Map();
}

/**
 * The response a status falls under: the exact code, then its class, then
 * `default`. `drift` accepts the lowercase class form too, and the two have to
 * agree on which response describes an exchange.
 */
export function matchStatusKey(documented: string[], status: number | undefined): string | undefined {
  if (status === undefined) return documented.includes('default') ? 'default' : undefined;

  const statusClass = `${Math.floor(status / 100)}XX`;
  const candidates = [String(status), statusClass, statusClass.toLowerCase(), 'default'];

  return candidates.find((candidate) => documented.includes(candidate));
}

/** Every response each operation documents, keyed as `method path`. */
export function collectStatuses(spec: Schema): Map<string, string[]> {
  const byOperation = new Map<string, string[]>();

  for (const [pathTemplate, item] of Object.entries(spec.paths ?? {}) as [string, Schema][]) {
    const { schema: pathItem } = resolve(spec, item);
    if (!pathItem) continue;

    for (const [method, operation] of Object.entries(pathItem) as [string, Schema][]) {
      if (!isHttpMethod(method) || !isPlainObject(operation)) continue;

      const { responses } = operation as Schema;
      byOperation.set(`${method} ${pathTemplate}`, Object.keys(responses ?? {}));
    }
  }

  return byOperation;
}

/** Note which documented response one exchange produced. */
export function recordStatus(
  use: StatusUse,
  operationKey: string,
  status: number | undefined,
  documented: string[]
): void {
  const key = matchStatusKey(documented, status);
  if (!key) return;

  if (!use.has(operationKey)) use.set(operationKey, new Set());
  use.get(operationKey)!.add(key);
}

/** Which documented responses the traffic produced. */
export function summarizeStatuses(
  declared: Map<string, string[]>,
  use: StatusUse
): StatusCoverage {
  const unused: string[] = [];
  let total = 0;
  let seen = 0;

  for (const [operationKey, statuses] of declared) {
    const produced = use.get(operationKey) ?? new Set<string>();
    const [method, ...rest] = operationKey.split(' ');

    for (const status of statuses) {
      total += 1;

      if (produced.has(status)) {
        seen += 1;
        continue;
      }

      unused.push(`${method.toUpperCase()} ${rest.join(' ')}  ${status}`);
    }
  }

  return { seen, total, unused: unused.sort() };
}
